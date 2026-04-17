/**
 * Security sanitization utilities
 * Prevents sensitive data from being logged or exposed
 */

// Patterns for sensitive data that should be redacted
const SENSITIVE_PATTERNS = {
  // API Keys
  apiKey: /(?:api[_-]?key|apikey)[\s]*[=:][\s]*["']?[a-zA-Z0-9_\-]{16,}["']?/gi,
  // AWS Access Key IDs
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,
  // AWS Secret Keys (in URLs or JSON)
  awsSecret: /[0-9a-zA-Z/+]{40}/g,
  // Private keys
  privateKey: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gi,
  // Passwords in URLs
  urlPassword: /:\/\/[^:\s]+:([^@\s]+)@/g,
  // Bearer tokens
  bearerToken: /bearer[\s]+[a-zA-Z0-9_\-\.=]+/gi,
  // Authorization headers
  authHeader: /authorization[\s]*:[\s]*["']?[^"'\s]+["']?/gi,
  // OAuth tokens
  oauthToken: /(?:access[_-]?token|refresh[_-]?token)[\s]*[=:][\s]*["']?[a-zA-Z0-9_\-\.]+["']?/gi,
  // Session cookies
  sessionCookie: /session[_-]?[a-z]*[\s]*[=:][\s]*["']?[a-zA-Z0-9_\-]+["']?/gi,
  // Credit card numbers (basic pattern)
  creditCard: /\b(?:\d{4}[\s-]?){3}\d{4}\b/g,
  // Social Security Numbers
  ssn: /\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g,
  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
} as const;

/**
 * Redacts sensitive patterns from a string
 * @param input The string to sanitize
 * @returns Sanitized string with sensitive data replaced with [REDACTED]
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // Apply each pattern
  for (const [name, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    sanitized = sanitized.replace(pattern, `[REDACTED:${name}]`);
  }

  return sanitized;
}

/**
 * Deep sanitizes an object, redacting sensitive data in string values
 * @param obj The object to sanitize
 * @returns A new object with sensitive data redacted
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj) as unknown as T;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key name too (might contain sensitive info)
      const sanitizedKey = sanitizeString(key);
      result[sanitizedKey] = sanitizeObject(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Sanitizes data for logging purposes
 * Removes sensitive fields and truncates large values
 * @param data The data to prepare for logging
 * @param maxLength Maximum length for string values
 * @returns Sanitized data safe for logging
 */
export function sanitizeForLogging<T>(
  data: T,
  maxLength: number = 1000
): T {
  if (data === null || data === undefined) {
    return data;
  }

  // First apply deep sanitization
  const sanitized = sanitizeObject(data);

  // Then truncate if needed
  return truncateLargeValues(sanitized, maxLength);
}

/**
 * Truncates large string values in an object
 */
function truncateLargeValues<T>(obj: T, maxLength: number): T {
  if (typeof obj === 'string') {
    if (obj.length > maxLength) {
      return `${obj.slice(0, maxLength)}...[truncated ${obj.length - maxLength} chars]` as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    // Truncate large arrays
    if (obj.length > 100) {
      const truncated = obj.slice(0, 100).map(item => truncateLargeValues(item, maxLength));
      return [...truncated, `[...${obj.length - 100} more items]`] as unknown as T;
    }
    return obj.map(item => truncateLargeValues(item, maxLength)) as unknown as T;
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = truncateLargeValues(value, maxLength);
    }
    return result as T;
  }

  return obj;
}

/**
 * Sanitizes an error for logging
 * Removes sensitive data from error messages and stack traces
 */
export function sanitizeError(error: Error): Error {
  const sanitizedMessage = sanitizeString(error.message);
  const sanitizedStack = error.stack ? sanitizeString(error.stack) : undefined;

  // Create a new error with sanitized data
  const sanitizedError = new Error(sanitizedMessage);
  sanitizedError.name = error.name;
  sanitizedError.stack = sanitizedStack;

  // Copy any custom properties
  for (const [key, value] of Object.entries(error)) {
    if (key !== 'message' && key !== 'stack' && key !== 'name') {
      (sanitizedError as Record<string, unknown>)[key] = sanitizeObject(value);
    }
  }

  return sanitizedError;
}

/**
 * Sanitizes a URL, removing sensitive query parameters
 * @param url The URL to sanitize
 * @param sensitiveParams Query parameter names to redact
 * @returns Sanitized URL
 */
export function sanitizeUrl(
  url: string,
  sensitiveParams: string[] = ['token', 'key', 'secret', 'password', 'api_key', 'access_token']
): string {
  try {
    const parsed = new URL(url);

    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '[REDACTED]');
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, try regex-based sanitization
    return sanitizeString(url);
  }
}

/**
 * Creates a safe copy of headers for logging
 * Removes sensitive headers like Authorization
 */
export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | string[]> {
  const sensitiveHeaders = new Set([
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'proxy-authorization',
  ]);

  const result: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveHeaders.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result;
}
