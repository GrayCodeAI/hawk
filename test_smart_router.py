"""
test_smart_router.py
--------------------
Tests for the SmartRouter.
Run: pytest test_smart_router.py -v
"""

import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock, patch
from smart_router import SmartRouter, Provider, CircuitState


# ── Fixtures ──────────────────────────────────────────────────────────────────


def make_provider(
    name, healthy=True, configured=True, latency=100.0, cost=0.002, errors=0, requests=0
):
    api_key_env = f"{name.upper()}_API_KEY_TEST"
    if configured:
        os.environ[api_key_env] = "test-key"
    else:
        os.environ.pop(api_key_env, None)

    p = Provider(
        name=name,
        ping_url=f"https://{name}.example.com/health",
        api_key_env=api_key_env,
        cost_per_1k_tokens=cost,
        big_model=f"{name}-big",
        small_model=f"{name}-small",
    )
    p.healthy = healthy
    p.avg_latency_ms = latency
    p.error_count = errors
    p.request_count = requests
    return p


def make_router(providers=None, strategy="balanced"):
    r = SmartRouter(providers=providers, strategy=strategy)
    r._initialized = True
    return r


# ── Provider.score() ──────────────────────────────────────────────────────────


def test_score_unhealthy_is_inf():
    p = make_provider("openai", healthy=False)
    assert p.score() == float("inf")


def test_score_unconfigured_is_inf():
    p = make_provider("openai", configured=False)
    assert p.score() == float("inf")


def test_score_latency_strategy_prefers_faster():
    fast = make_provider("fast", latency=50.0, cost=0.01)
    slow = make_provider("slow", latency=500.0, cost=0.001)
    assert fast.score("latency") < slow.score("latency")


def test_score_cost_strategy_prefers_cheaper():
    cheap = make_provider("cheap", latency=500.0, cost=0.0001)
    expensive = make_provider("expensive", latency=50.0, cost=0.05)
    assert cheap.score("cost") < expensive.score("cost")


def test_score_balanced_strategy_uses_both():
    p = make_provider("test", latency=200.0, cost=0.002)
    s = p.score("balanced")
    assert s > 0


def test_score_error_rate_penalty():
    clean = make_provider("clean", errors=0, requests=10)
    dirty = make_provider("dirty", errors=8, requests=10)
    assert clean.score() < dirty.score()


# ── SmartRouter.is_large_request() ───────────────────────────────────────────


def test_is_large_request_short():
    r = make_router()
    msgs = [{"role": "user", "content": "Hello!"}]
    assert r.is_large_request(msgs) is False


def test_is_large_request_long():
    r = make_router()
    msgs = [{"role": "user", "content": "x" * 3000}]
    assert r.is_large_request(msgs) is True


# ── SmartRouter.select_provider() ────────────────────────────────────────────


def test_select_provider_picks_best_score():
    p1 = make_provider("slow", latency=800.0)
    p2 = make_provider("fast", latency=50.0)
    r = make_router(providers=[p1, p2], strategy="latency")
    selected = r.select_provider()
    assert selected.name == "fast"


def test_select_provider_skips_unhealthy():
    p1 = make_provider("bad", healthy=False)
    p2 = make_provider("good", healthy=True)
    r = make_router(providers=[p1, p2])
    selected = r.select_provider()
    assert selected.name == "good"


def test_select_provider_returns_none_when_all_down():
    p1 = make_provider("a", healthy=False)
    p2 = make_provider("b", healthy=False)
    r = make_router(providers=[p1, p2])
    assert r.select_provider() is None


# ── SmartRouter.get_model_for_provider() ─────────────────────────────────────


def test_get_model_large_request():
    p = make_provider("openai")
    r = make_router()
    model = r.get_model_for_provider(p, "hawk-sonnet")
    assert model == "openai-big"


def test_get_model_small_request():
    p = make_provider("openai")
    r = make_router()
    model = r.get_model_for_provider(p, "hawk-haiku")
    assert model == "openai-small"


# ── SmartRouter.route() ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_route_returns_best_provider():
    p1 = make_provider("expensive", cost=0.05, latency=50.0)
    p2 = make_provider("cheap", cost=0.0005, latency=200.0)
    r = make_router(providers=[p1, p2], strategy="cost")
    result = await r.route([{"role": "user", "content": "Hi"}], "hawk-haiku")
    assert result["provider"] == "cheap"


@pytest.mark.asyncio
async def test_route_raises_when_no_providers():
    p = make_provider("a", healthy=False)
    r = make_router(providers=[p])
    with pytest.raises(RuntimeError, match="no providers available"):
        await r.route([{"role": "user", "content": "Hi"}])


@pytest.mark.asyncio
async def test_route_excludes_providers():
    p1 = make_provider("openai", latency=50.0)
    p2 = make_provider("gemini", latency=200.0)
    r = make_router(providers=[p1, p2], strategy="latency")
    result = await r.route(
        [{"role": "user", "content": "Hi"}], exclude_providers=["openai"]
    )
    assert result["provider"] == "gemini"


# ── SmartRouter.record_result() ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_record_result_updates_latency():
    p = make_provider("openai", latency=200.0)
    r = make_router(providers=[p])
    await r.record_result("openai", success=True, duration_ms=100.0)
    assert p.avg_latency_ms < 200.0  # should decrease toward 100


@pytest.mark.asyncio
async def test_record_result_increments_requests():
    p = make_provider("openai")
    r = make_router(providers=[p])
    await r.record_result("openai", success=True, duration_ms=100.0)
    assert p.request_count == 1


@pytest.mark.asyncio
async def test_record_result_increments_errors():
    p = make_provider("openai")
    r = make_router(providers=[p])
    await r.record_result("openai", success=False, duration_ms=0)
    assert p.error_count == 1


# ── SmartRouter.status() ─────────────────────────────────────────────────────


def test_status_returns_all_providers():
    p1 = make_provider("openai")
    p2 = make_provider("gemini")
    r = make_router(providers=[p1, p2])
    status = r.status()
    assert len(status) == 2
    names = [s["provider"] for s in status]
    assert "openai" in names
    assert "gemini" in names


def test_status_contains_required_fields():
    p = make_provider("openai")
    r = make_router(providers=[p])
    status = r.status()[0]
    for field in [
        "provider",
        "healthy",
        "latency_ms",
        "cost_per_1k",
        "requests",
        "errors",
        "score",
    ]:
        assert field in status


# ── Edge Case Tests ───────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_route_all_providers_down():
    """Test that route raises when all providers are unhealthy."""
    p1 = make_provider("a", healthy=False)
    p2 = make_provider("b", healthy=False)
    p3 = make_provider("c", healthy=False, configured=False)
    r = make_router(providers=[p1, p2, p3])
    with pytest.raises(RuntimeError, match="no providers available"):
        await r.route([{"role": "user", "content": "Hi"}])


@pytest.mark.asyncio
async def test_provider_recovery_after_failure():
    """Test provider recovers after being marked unhealthy."""
    p = make_provider("test", healthy=True)
    r = make_router(providers=[p])

    # Mark as unhealthy with high error rate
    p.request_count = 10
    p.error_count = 9
    p.healthy = False
    p.circuit_state = CircuitState.OPEN

    # Simulate recovery by resetting circuit state
    p.circuit_state = CircuitState.CLOSED
    p.healthy = True
    p.consecutive_failures = 0
    p.error_count = 0

    result = await r.route([{"role": "user", "content": "Hi"}])
    assert result["provider"] == "test"


@pytest.mark.asyncio
async def test_concurrent_routing_decisions():
    """Test multiple concurrent route calls don't corrupt state."""
    p1 = make_provider("fast", latency=50.0)
    p2 = make_provider("slow", latency=500.0)
    r = make_router(providers=[p1, p2])

    async def route_request():
        return await r.route([{"role": "user", "content": "Hi"}])

    # Run 50 concurrent routing decisions
    results = await asyncio.gather(*[route_request() for _ in range(50)])

    # All should return valid providers
    for result in results:
        assert result["provider"] in ["fast", "slow"]

    # Total requests should be 50
    assert p1.request_count + p2.request_count == 50


@pytest.mark.asyncio
async def test_strategy_switching_at_runtime():
    """Test that strategy can be changed and affects routing."""
    # Fast but expensive
    p1 = make_provider("fast", latency=10.0, cost=1.0)
    # Slow but cheap
    p2 = make_provider("slow", latency=1000.0, cost=0.001)
    r = make_router(providers=[p1, p2], strategy="latency")

    # Latency strategy should pick fast
    result1 = await r.route([{"role": "user", "content": "Hi"}])
    assert result1["provider"] == "fast"

    # Switch to cost strategy
    r.strategy = "cost"
    result2 = await r.route([{"role": "user", "content": "Hi"}])
    assert result2["provider"] == "slow"


@pytest.mark.asyncio
async def test_circuit_breaker_opens_on_failures():
    """Test circuit breaker opens after threshold failures."""
    from smart_router import CIRCUIT_BREAKER_FAILURE_THRESHOLD

    p = make_provider("test")
    r = make_router(providers=[p])

    # Record multiple failures
    for _ in range(CIRCUIT_BREAKER_FAILURE_THRESHOLD):
        await r.record_result("test", success=False, duration_ms=0)

    # Circuit should be OPEN
    assert p.circuit_state == CircuitState.OPEN
    assert not p.can_execute()


@pytest.mark.asyncio
async def test_circuit_breaker_half_open_recovery():
    """Test circuit breaker transitions from half-open to closed on success."""
    from smart_router import CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS

    p = make_provider("test")
    r = make_router(providers=[p])

    # Start in half-open state
    p.circuit_state = CircuitState.HALF_OPEN
    p.half_open_successes = 0

    # Record successes up to threshold
    for _ in range(CIRCUIT_BREAKER_HALF_OPEN_MAX_CALLS):
        p.record_success()

    # Circuit should now be CLOSED
    assert p.circuit_state == CircuitState.CLOSED


@pytest.mark.asyncio
async def test_rate_limiting_health_checks():
    """Test health checks are rate limited."""
    p = make_provider("test")
    p.last_health_check_time = asyncio.get_event_loop().time()
    r = make_router(providers=[p])

    # Immediately try to ping again
    start_time = p.last_health_check_time
    await r._ping_provider(p)

    # Should be throttled, time shouldn't change
    assert p.last_health_check_time == start_time


def test_ssrf_blocked_private_ip():
    """Test SSRF protection blocks private IPs."""
    from smart_router import validate_url
    assert validate_url("http://localhost/api") is False
    assert validate_url("http://127.0.0.1/api") is False
    assert validate_url("http://192.168.1.1/api") is False
    assert validate_url("http://10.0.0.1/api") is False


def test_ssrf_allowed_public_url():
    """Test SSRF protection allows public URLs."""
    from smart_router import validate_url
    assert validate_url("https://api.openai.com/v1/models") is True
    assert validate_url("https://generativelanguage.googleapis.com/v1/models") is True


def test_ssrf_blocks_dangerous_schemes():
    """Test SSRF protection blocks non-HTTP schemes."""
    from smart_router import validate_url
    assert validate_url("file:///etc/passwd") is False
    assert validate_url("ftp://example.com/file") is False
    assert validate_url("ldap://example.com") is False


@pytest.mark.asyncio
async def test_empty_messages_list():
    """Test routing with empty messages."""
    p = make_provider("test")
    r = make_router(providers=[p])
    result = await r.route([], "hawk-sonnet")
    assert result["provider"] == "test"


@pytest.mark.asyncio
async def test_provider_exclusion_with_all_excluded():
    """Test routing when all providers are excluded."""
    p1 = make_provider("a")
    p2 = make_provider("b")
    r = make_router(providers=[p1, p2])

    with pytest.raises(RuntimeError, match="no providers available"):
        await r.route(
            [{"role": "user", "content": "Hi"}],
            exclude_providers=["a", "b"]
        )
