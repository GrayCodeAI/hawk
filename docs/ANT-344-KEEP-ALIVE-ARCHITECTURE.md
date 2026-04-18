# ANT-344: Keep-Alive Channel Architecture

## Overview

This document describes the keep-alive channel architecture for maintaining persistent connections with AI providers.

## Current Implementation

### Location
`src/services/api/withRetry.ts:91`

### Current Behavior
```typescript
// TODO(ANT-344): the keep-alive via SystemAPIErrorMessage yields is a stopgap
// implementation that relies on string-matching error messages.
```

## Proposed Architecture

### 1. Dedicated Keep-Alive Channel

**Purpose**: Maintain a separate connection for heartbeat/ping messages

**Implementation**:
```typescript
interface KeepAliveChannel {
  // Send periodic heartbeat
  sendHeartbeat(): Promise<void>

  // Detect connection health
  checkConnectionHealth(): ConnectionStatus

  // Graceful reconnection
  reconnect(): Promise<void>
}
```

### 2. Response Header Detection

**Preferred Approach**: Use `x-keep-alive-timeout` header

**Benefits**:
- More reliable than string matching
- Provider-agnostic
- Easy to test and mock

**Implementation**:
```typescript
function shouldTriggerKeepAlive(response: Response): boolean {
  return response.headers.has('x-keep-alive-timeout') ||
         response.status === 529 // Overloaded
}
```

### 3. Exponential Backoff Strategy

**For 529 Errors**:
```
Initial delay: 1s
Max delay: 60s
Multiplier: 2x
Jitter: ±20%
```

### 4. Connection State Management

**States**:
- `CONNECTED` - Active connection
- `KEEP_ALIVE` - Sending heartbeats
- `RECONNECTING` - Attempting reconnection
- `DISCONNECTED` - Connection lost

## Migration Plan

### Phase 1: Header Detection (Current)
- [x] Implement string-based detection (stopgap)
- [ ] Add header detection when API supports it

### Phase 2: Dedicated Channel
- [ ] Create KeepAliveChannel interface
- [ ] Implement heartbeat mechanism
- [ ] Add connection health monitoring

### Phase 3: Full Integration
- [ ] Replace stopgap implementation
- [ ] Add metrics and logging
- [ ] Performance benchmarks

## Testing

### Unit Tests
- Heartbeat timing
- Reconnection logic
- State transitions

### Integration Tests
- Real provider connections
- Network failure simulation
- Load testing

## References

- Original TODO: `src/services/api/withRetry.ts:91`
- Related: Error handling in `src/services/api/errorUtils.ts`
