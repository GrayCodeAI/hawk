"""
smart_router.py
---------------
Intelligent auto-router for hawk.

Instead of always using one fixed provider, the smart router:
- Pings all configured providers on startup
- Scores them by latency, cost, and health
- Routes each request to the optimal provider
- Falls back automatically if a provider fails
- Learns from real request timings over time

Usage in server.py:
    from smart_router import SmartRouter
    router = SmartRouter()
    await router.initialize()
    result = await router.route(messages, model, stream)

.env config:
    ROUTER_MODE=smart          # or: fixed (default behaviour)
    ROUTER_STRATEGY=latency    # or: cost, balanced
    ROUTER_FALLBACK=true       # auto-retry on failure

Contribution to: https://github.com/Gitlawb/hawk
"""

import asyncio
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, field
from typing import Optional
from urllib.parse import urlparse
import httpx


# ── SSRF Protection ───────────────────────────────────────────────────────────

# Blocked URL patterns for SSRF protection
SSRF_BLOCKED_HOSTS = {
    "localhost", "127.0.0.1", "0.0.0.0", "::1",
    "[::1]", "169.254.", "10.", "192.168.", "172.16.",
    "172.17.", "172.18.", "172.19.", "172.20.", "172.21.",
    "172.22.", "172.23.", "172.24.", "172.25.", "172.26.",
    "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
}
SSRF_BLOCKED_SCHEMES = {"file", "ftp", "gopher", "dict", "ldap", "tftp"}


def validate_url(url: str) -> bool:
    """
    Validate URL to prevent SSRF attacks.
    Returns True if URL is safe, False otherwise.
    """
    try:
        parsed = urlparse(url)

        # Check scheme
        if parsed.scheme in SSRF_BLOCKED_SCHEMES:
            logger.warning(f"SSRF blocked: scheme '{parsed.scheme}' not allowed")
            return False

        if parsed.scheme not in {"http", "https"}:
            logger.warning(f"SSRF blocked: scheme '{parsed.scheme}' not in allowed list")
            return False

        # Check hostname
        hostname = parsed.hostname
        if not hostname:
            return False

        hostname_lower = hostname.lower()

        # Check against blocked patterns
        for blocked in SSRF_BLOCKED_HOSTS:
            if hostname_lower.startswith(blocked.lower()):
                logger.warning(f"SSRF blocked: hostname '{hostname}' matches blocked pattern")
                return False

        # Check for IP address patterns
        if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", hostname):
            # It's an IP - check if private
            parts = hostname.split(".")
            if len(parts) == 4:
                try:
                    first_octet = int(parts[0])
                    second_octet = int(parts[1])
                    # Class A private: 10.0.0.0/8
                    if first_octet == 10:
                        logger.warning(f"SSRF blocked: private IP range {hostname}")
                        return False
                    # Class B private: 172.16.0.0/12
                    if first_octet == 172 and 16 <= second_octet <= 31:
                        logger.warning(f"SSRF blocked: private IP range {hostname}")
                        return False
                    # Class C private: 192.168.0.0/16
                    if first_octet == 192 and second_octet == 168:
                        logger.warning(f"SSRF blocked: private IP range {hostname}")
                        return False
                except ValueError:
                    pass

        return True
    except Exception as e:
        logger.warning(f"SSRF validation error: {e}")
        return False


class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "provider"):
            log_data["provider"] = record.provider
        if hasattr(record, "latency_ms"):
            log_data["latency_ms"] = record.latency_ms
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


def setup_logging() -> None:
    """Configure logging based on environment settings."""
    handler = logging.StreamHandler(sys.stdout)

    if os.getenv("ROUTER_LOG_FORMAT", "text").lower() == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        )

    logger = logging.getLogger(__name__)
    logger.addHandler(handler)
    logger.setLevel(os.getenv("ROUTER_LOG_LEVEL", "INFO").upper())


setup_logging()
logger = logging.getLogger(__name__)

# ── Configuration Constants ────────────────────────────────────────────────────

# Request sizing thresholds
LARGE_REQUEST_THRESHOLD_CHARS = int(
    os.getenv("ROUTER_LARGE_REQUEST_THRESHOLD", "2000")
)

# Health check and retry settings
HEALTH_CHECK_TIMEOUT_SECONDS = float(
    os.getenv("ROUTER_HEALTH_TIMEOUT", "5.0")
)
PROVIDER_RECHECK_DELAY_SECONDS = float(
    os.getenv("ROUTER_RECHECK_DELAY", "60")
)

# Scoring algorithm weights
EMA_ALPHA = float(os.getenv("ROUTER_EMA_ALPHA", "0.3"))  # Exponential moving average weight
ERROR_PENALTY_MULTIPLIER = float(
    os.getenv("ROUTER_ERROR_PENALTY", "500")
)
ERROR_RATE_THRESHOLD = float(
    os.getenv("ROUTER_ERROR_THRESHOLD", "0.7")
)
MIN_REQUESTS_FOR_ERROR_RATE = int(
    os.getenv("ROUTER_MIN_REQUESTS_ERROR", "3")
)

# HTTP connection pooling
HTTP_MAX_CONNECTIONS = int(os.getenv("ROUTER_HTTP_MAX_CONN", "10"))
HTTP_MAX_KEEPALIVE = int(os.getenv("ROUTER_HTTP_KEEPALIVE", "5"))

# Circuit breaker settings
CIRCUIT_BREAKER_FAILURE_THRESHOLD = int(
    os.getenv("ROUTER_CB_FAILURE_THRESHOLD", "5")
)
CIRCUIT_BREAKER_RECOVERY_TIMEOUT = float(
    os.getenv("ROUTER_CB_RECOVERY_TIMEOUT", "30")
)
CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS = int(
    os.getenv("ROUTER_CB_HALF_OPEN_MAX", "3")
)

# Rate limiting for health checks
HEALTH_CHECK_MIN_INTERVAL_SECONDS = float(
    os.getenv("ROUTER_HEALTH_MIN_INTERVAL", "5.0")
)

# Retry mechanism settings
MAX_RETRY_ATTEMPTS = int(os.getenv("ROUTER_MAX_RETRIES", "3"))
RETRY_BACKOFF_BASE_SECONDS = float(os.getenv("ROUTER_BACKOFF_BASE", "1.0"))
RETRY_JITTER_MAX_SECONDS = float(os.getenv("ROUTER_JITTER_MAX", "0.5"))

# ── Circuit Breaker State ─────────────────────────────────────────────────────

from enum import Enum


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered


# ── Provider definitions ──────────────────────────────────────────────────────


@dataclass
class Provider:
    name: str  # e.g. "openai", "gemini", "ollama"
    ping_url: str  # URL used to check health
    api_key_env: str  # env var name for API key
    cost_per_1k_tokens: float  # estimated cost USD per 1k tokens
    big_model: str  # model for sonnet/large requests
    small_model: str  # model for haiku/small requests
    latency_ms: float = 9999.0  # updated by benchmark
    healthy: bool = True  # updated by health checks
    request_count: int = 0  # total requests routed here
    error_count: int = 0  # total errors from this provider
    avg_latency_ms: float = 9999.0  # rolling average from real requests
    # Circuit breaker fields
    circuit_state: CircuitState = field(default=CircuitState.CLOSED)
    consecutive_failures: int = 0
    last_failure_time: float = field(default=0.0)
    half_open_successes: int = 0
    # Rate limiting fields
    last_health_check_time: float = field(default=0.0)
    _health_check_lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    @property
    def api_key(self) -> Optional[str]:
        return os.getenv(self.api_key_env)

    @property
    def is_configured(self) -> bool:
        """True if the provider has an API key set."""
        if self.name == "ollama":
            return True  # Ollama needs no API key
        return bool(self.api_key)

    @property
    def error_rate(self) -> float:
        if self.request_count == 0:
            return 0.0
        return self.error_count / self.request_count

    def score(self, strategy: str = "balanced") -> float:
        """
        Lower score = better provider.
        strategy: 'latency' | 'cost' | 'balanced'
        """
        if not self.healthy or not self.is_configured:
            return float("inf")

        latency_score = self.avg_latency_ms / 1000.0  # normalize to seconds
        cost_score = self.cost_per_1k_tokens * 100  # normalize to similar scale
        error_penalty = self.error_rate * ERROR_PENALTY_MULTIPLIER

        if strategy == "latency":
            return latency_score + error_penalty
        elif strategy == "cost":
            return cost_score + error_penalty
        else:  # balanced
            return (latency_score * 0.5) + (cost_score * 0.5) + error_penalty

    # ── Circuit Breaker Methods ────────────────────────────────────────────────

    def can_execute(self) -> bool:
        """Check if provider can accept requests based on circuit state."""
        if self.circuit_state == CircuitState.CLOSED:
            return True
        if self.circuit_state == CircuitState.OPEN:
            # Check if recovery timeout has passed
            if time.monotonic() - self.last_failure_time >= CIRCUIT_BREAKER_RECOVERY_TIMEOUT:
                self.circuit_state = CircuitState.HALF_OPEN
                self.half_open_successes = 0
                logger.info(f"Circuit breaker: {self.name} entering HALF_OPEN state")
                return True
            return False
        if self.circuit_state == CircuitState.HALF_OPEN:
            # Allow limited requests in half-open state
            return self.half_open_successes < CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS
        return True

    def record_success(self) -> None:
        """Record successful request for circuit breaker."""
        self.consecutive_failures = 0
        if self.circuit_state == CircuitState.HALF_OPEN:
            self.half_open_successes += 1
            if self.half_open_successes >= CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS:
                self.circuit_state = CircuitState.CLOSED
                self.half_open_successes = 0
                logger.info(f"Circuit breaker: {self.name} CLOSED (recovered)")

    def record_failure(self) -> None:
        """Record failed request for circuit breaker."""
        self.consecutive_failures += 1
        self.last_failure_time = time.monotonic()
        if self.circuit_state == CircuitState.HALF_OPEN:
            self.circuit_state = CircuitState.OPEN
            logger.warning(f"Circuit breaker: {self.name} OPEN (failed in half-open)")
        elif self.consecutive_failures >= CIRCUIT_BREAKER_FAILURE_THRESHOLD:
            if self.circuit_state != CircuitState.OPEN:
                self.circuit_state = CircuitState.OPEN
                logger.warning(
                    f"Circuit breaker: {self.name} OPEN "
                    f"({self.consecutive_failures} consecutive failures)"
                )


# ── Default provider catalogue ────────────────────────────────────────────────


def build_default_providers() -> list[Provider]:
    big = os.getenv("BIG_MODEL", "gpt-4.1")
    small = os.getenv("SMALL_MODEL", "gpt-4.1-mini")
    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    return [
        Provider(
            name="openai",
            ping_url="https://api.openai.com/v1/models",
            api_key_env="OPENAI_API_KEY",
            cost_per_1k_tokens=0.002,
            big_model=big if "gpt" in big else "gpt-4.1",
            small_model=small if "gpt" in small else "gpt-4.1-mini",
        ),
        Provider(
            name="gemini",
            ping_url="https://generativelanguage.googleapis.com/v1/models",
            api_key_env="GEMINI_API_KEY",
            cost_per_1k_tokens=0.0005,
            big_model=big if "gemini" in big else "gemini-2.5-pro",
            small_model=small if "gemini" in small else "gemini-2.0-flash",
        ),
        Provider(
            name="ollama",
            ping_url=f"{ollama_url}/api/tags",
            api_key_env="",
            cost_per_1k_tokens=0.0,  # free — local
            big_model=big if "gemini" not in big and "gpt" not in big else "llama3:8b",
            small_model=small
            if "gemini" not in small and "gpt" not in small
            else "llama3:8b",
        ),
    ]


# ── Smart Router ──────────────────────────────────────────────────────────────


class SmartRouter:
    """
    Intelligently routes Hawk API requests to the best
    available LLM provider based on latency, cost, and health.
    """

    def __init__(
        self,
        providers: Optional[list[Provider]] = None,
        strategy: Optional[str] = None,
        fallback_enabled: Optional[bool] = None,
    ):
        self.providers = providers or build_default_providers()
        self.strategy = strategy or os.getenv("ROUTER_STRATEGY", "balanced")
        self.fallback_enabled = (
            fallback_enabled
            if fallback_enabled is not None
            else os.getenv("ROUTER_FALLBACK", "true").lower() == "true"
        )
        self._initialized = False
        self._http_client: Optional[httpx.AsyncClient] = None

    def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create shared HTTP client with connection pooling."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=HEALTH_CHECK_TIMEOUT_SECONDS,
                limits=httpx.Limits(
                    max_connections=HTTP_MAX_CONNECTIONS,
                    max_keepalive_connections=HTTP_MAX_KEEPALIVE,
                ),
            )
        return self._http_client

    async def close(self) -> None:
        """Close the HTTP client and cleanup resources."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    # ── Initialization ────────────────────────────────────────────────────────

    async def initialize(self) -> None:
        """Ping all providers and build initial latency scores."""
        logger.info("SmartRouter: benchmarking providers...")
        await asyncio.gather(
            *[self._ping_provider(p) for p in self.providers],
            return_exceptions=True,
        )
        available = [p for p in self.providers if p.healthy and p.is_configured]
        logger.info(
            f"SmartRouter ready. Available providers: {[p.name for p in available]}"
        )
        if not available:
            logger.warning(
                "SmartRouter: no providers available! Check your API keys in .env"
            )
        self._initialized = True

    async def _ping_provider(self, provider: Provider) -> None:
        """Measure latency to a provider's health endpoint."""
        if not provider.is_configured:
            provider.healthy = False
            logger.debug(f"SmartRouter: {provider.name} skipped — no API key")
            return

        # SSRF protection: validate URL
        if not validate_url(provider.ping_url):
            provider.healthy = False
            logger.warning(f"SmartRouter: {provider.name} URL failed SSRF validation")
            return

        # Rate limiting: don't check too frequently
        async with provider._health_check_lock:
            now = time.monotonic()
            time_since_last = now - provider.last_health_check_time
            if time_since_last < HEALTH_CHECK_MIN_INTERVAL_SECONDS:
                logger.debug(f"SmartRouter: {provider.name} health check throttled "
                           f"(wait {HEALTH_CHECK_MIN_INTERVAL_SECONDS - time_since_last:.1f}s)")
                return
            provider.last_health_check_time = now

        headers = {}
        if provider.api_key:
            headers["Authorization"] = f"Bearer {provider.api_key}"

        start = time.monotonic()
        try:
            client = self._get_http_client()
            resp = await client.get(provider.ping_url, headers=headers)
            elapsed_ms = (time.monotonic() - start) * 1000
            if resp.status_code == 200:
                provider.healthy = True
                provider.latency_ms = elapsed_ms
                provider.avg_latency_ms = elapsed_ms
                logger.info(
                    f"SmartRouter: {provider.name} OK "
                    f"({elapsed_ms:.0f}ms, status={resp.status_code})"
                )
                else:
                    provider.healthy = False
                    logger.warning(
                        f"SmartRouter: {provider.name} unhealthy "
                        f"(status={resp.status_code})"
                    )
        except Exception as e:
            provider.healthy = False
            logger.warning(f"SmartRouter: {provider.name} unreachable — {e}")

    # ── Routing logic ─────────────────────────────────────────────────────────

    def select_provider(self, exclude: Optional[set[str]] = None) -> Optional[Provider]:
        """
        Pick the best available provider for this request.
        Returns None if no providers are available.
        """
        excluded = exclude or set()
        available = [
            p for p in self.providers
            if p.healthy and p.is_configured and p.name not in excluded and p.can_execute()
        ]
        if not available:
            return None

        return min(available, key=lambda p: p.score(self.strategy))

    def get_model_for_provider(self, provider: Provider, hawk_model: str) -> str:
        """Map a Hawk model name to the provider's actual model."""
        is_large = any(
            keyword in hawk_model.lower()
            for keyword in ["opus", "sonnet", "large", "big"]
        )
        return provider.big_model if is_large else provider.small_model

    def is_large_request(self, messages: list[dict]) -> bool:
        """Estimate if this is a large request based on message length."""
        total_chars = sum(len(str(m.get("content", ""))) for m in messages)
        return total_chars > LARGE_REQUEST_THRESHOLD_CHARS

    def _update_latency(self, provider: Provider, duration_ms: float) -> None:
        """Exponential moving average update for latency tracking."""
        provider.avg_latency_ms = (
            EMA_ALPHA * duration_ms + (1 - EMA_ALPHA) * provider.avg_latency_ms
        )

    # ── Retry helper methods ──────────────────────────────────────────────────

    def _should_retry(self, error: Exception) -> bool:
        """Determine if an error is retryable."""
        # Retry on network errors, timeout, rate limits
        return isinstance(error, (
            httpx.TimeoutException,
            httpx.NetworkError,
            httpx.TooManyRedirects,
        ))

    async def _exponential_backoff(self, attempt: int) -> None:
        """Sleep with exponential backoff and jitter."""
        import random
        backoff = RETRY_BACKOFF_BASE_SECONDS * (2 ** attempt)
        jitter = random.uniform(0, RETRY_JITTER_MAX_SECONDS)
        await asyncio.sleep(backoff + jitter)

    # ── Main routing entry point ──────────────────────────────────────────────

    async def route(
        self,
        messages: list[dict],
        hawk_model: str = "hawk-sonnet",
        attempt: int = 0,
        exclude_providers: Optional[list[str]] = None,
    ) -> dict:
        """
        Route a request to the best provider.
        Returns a dict with routing decision info:
          {
            "provider": provider name,
            "model": actual model to use,
            "provider_object": the Provider dataclass instance,
          }
        Raises RuntimeError if no providers available.
        """
        if not self._initialized:
            await self.initialize()

        exclude = set(exclude_providers or [])
        large = self.is_large_request(messages)

        provider = self.select_provider(exclude=exclude)
        if not provider:
            raise RuntimeError(
                "SmartRouter: no providers available. "
                "Check your API keys and provider health."
            )
        model = self.get_model_for_provider(provider, hawk_model)

        logger.debug(
            f"SmartRouter: routing to {provider.name}/{model} "
            f"(strategy={self.strategy}, large={large}, attempt={attempt})"
        )

        return {
            "provider": provider.name,
            "model": model,
            "provider_object": provider,
        }

    async def record_result(
        self,
        provider_name: str,
        success: bool,
        duration_ms: float,
    ) -> None:
        """
        Record the outcome of a request.
        Called after each proxied request to update provider scores.
        """
        provider = next((p for p in self.providers if p.name == provider_name), None)
        if not provider:
            return

        provider.request_count += 1
        if success:
            self._update_latency(provider, duration_ms)
            provider.record_success()
        else:
            provider.error_count += 1
            provider.record_failure()
            # After minimum requests, mark unhealthy if error rate exceeds threshold
            if (provider.request_count >= MIN_REQUESTS_FOR_ERROR_RATE and
                provider.error_rate > ERROR_RATE_THRESHOLD):
                logger.warning(
                    f"SmartRouter: {provider_name} error rate high "
                    f"({provider.error_rate:.0%}), marking unhealthy"
                )
                provider.healthy = False
                # Schedule re-check after configured delay
                asyncio.create_task(self._recheck_provider(
                    provider, delay=PROVIDER_RECHECK_DELAY_SECONDS
                ))

    async def _recheck_provider(self, provider: Provider, delay: float = 60) -> None:
        """Re-ping a provider after a delay and restore if healthy."""
        await asyncio.sleep(delay)
        await self._ping_provider(provider)
        if provider.healthy:
            logger.info(f"SmartRouter: {provider.name} recovered, re-adding to pool")

    # ── Status report ─────────────────────────────────────────────────────────

    def status(self) -> list[dict]:
        """Return current provider status for monitoring."""
        return [
            {
                "provider": p.name,
                "healthy": p.healthy,
                "configured": p.is_configured,
                "latency_ms": round(p.avg_latency_ms, 1),
                "cost_per_1k": p.cost_per_1k_tokens,
                "requests": p.request_count,
                "errors": p.error_count,
                "error_rate": f"{p.error_rate:.1%}",
                "score": round(p.score(self.strategy), 3)
                if p.healthy and p.is_configured
                else "N/A",
            }
            for p in self.providers
        ]
