# Hawk API Reference

## Core Services

### API Service

#### `withRetry.ts`
Provides retry logic with exponential backoff for API calls.

**Key Functions**:
- `withRetry<T>()` - Wraps API calls with retry logic
- `is529Error()` - Detects overloaded errors
- `isFastModeNotEnabledError()` - Detects fast mode errors

**Configuration**:
```typescript
interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  jitter: number
}
```

### MCP Service

#### `MCPConnectionManager.tsx`
Manages MCP server connections.

**Key Functions**:
- `connect()` - Establish MCP connection
- `disconnect()` - Clean disconnect
- `isHealthy()` - Health check

### Rate Limiting

#### `RateLimiter`
Token bucket rate limiter for API calls.

**Usage**:
```typescript
const limiter = new RateLimiter({
  tokensPerInterval: 100,
  interval: 'minute'
})

await limiter.removeTokens(1)
```

## Utility Functions

### Type Guards

#### `isFileEditOutput()`
Validates FileEditOutput type at runtime.

```typescript
if (isFileEditOutput(data)) {
  // data is FileEditOutput
}
```

### Error Handling

#### Custom Errors
- `ContentBlockError` - Invalid content block type
- `StreamTimeoutError` - Stream timeout
- `FileOperationError` - File operation failure
- `RateLimitError` - Rate limit exceeded

### Security

#### `sanitizeString()`
Removes sensitive data from strings.

**Patterns Sanitized**:
- API keys (`sk-*`)
- AWS credentials (`AKIA*`)
- Authorization headers
- Passwords

## Hooks

### `useDiffInIDE`
Opens diff view in IDE with 5-minute timeout.

```typescript
const { showDiffInIDE } = useDiffInIDE()
await showDiffInIDE(filePath, edits, context, tabName)
```

### `useRateLimit`
Hook for rate limiting UI components.

## Constants

### Time Constants
```typescript
const SECOND = 1000
const MINUTE = 60 * 1000
const HOUR = 60 * 60 * 1000
```

### Size Constants
```typescript
const KB = 1024
const MB = 1024 * 1024
const GB = 1024 * 1024 * 1024
```
