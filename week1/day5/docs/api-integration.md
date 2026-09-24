# API Integration Guide

## REST API Best Practices

- Use proper HTTP methods (`GET`, `POST`, `PUT`, `DELETE`)
- Implement error handling with try-catch and typed errors
- Add request caching with TTL and cache invalidation (`ApiService.js`)
- Handle rate limiting with throttling and exponential backoff
- Implement retry logic for transient failures (`fetchWithRetry`, `shouldRetry`)
- Use `AbortController` timeouts to cancel slow requests

## WebSocket Implementation

- Connection management: `connect()`, `disconnect()`, `handleReconnect()` (`WebSocketService.js`)
- Message handling: JSON parsing, `type` / `payload` routing, per-type subscribers
- Error recovery: `onclose` / `onerror` handling, max reconnect attempts
- Performance optimization: message queue (`messageQueue`), heartbeat ping/pong
- Security considerations: validate incoming messages, close codes, auth headers

## Real-Time Data

- Data synchronization: initial REST fetch plus WebSocket `dataUpdate` merges (`useRealTimeData.js`)
- Live updates: `useWebSocket` subscriptions update state without full refetch
- Connection status: `ConnectionStatus` component with connected / partial / disconnected states
- Error handling: mock fallback (`src/data/mockData.js`) when API is unreachable
- Performance monitoring: `getLastUpdate()`, manual `refresh()`, 30s auto-refresh interval
