# UML Diagrams — Advanced Dashboard System

Comprehensive UML / architecture diagrams for the system (Task 2).

Renders on GitHub, GitLab, VS Code (Markdown Preview Mermaid Support), and most docs sites.

## 1. System Component Diagram

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Dashboard Component]
        B[MetricsCard Component]
        C[ChartContainer Component]
        D[ApiService]
        E[WebSocketService]
    end

    subgraph "Backend Layer"
        F[Express Server]
        G[User Routes]
        H[Revenue Routes]
        I[Order Routes]
        J[DataService]
        K[CacheService]
    end

    subgraph "Data Layer"
        L[MongoDB]
        M[Redis Cache]
        N[File Storage]
    end

    A --> D
    A --> E
    B --> D
    C --> D
    C --> E

    D --> F
    E --> F

    F --> G
    F --> H
    F --> I

    G --> J
    H --> J
    I --> J

    J --> L
    J --> M
    K --> M
```

### How to read it

- **Frontend Layer**: `Dashboard`, `MetricsCard`, `ChartContainer` talk to the backend only through `ApiService` (REST) and `WebSocketService` (real-time).
- **Backend Layer**: Express routes (`users`, `revenue`, `orders`) delegate to `DataService`; `CacheService` fronts Redis.
- **Data Layer**: MongoDB is the source of truth, Redis is the cache, File Storage holds static assets/exports.

## 2. Request/Response Sequence (REST)

```mermaid
sequenceDiagram
    participant U as User / Browser
    participant C as Dashboard Component
    participant A as ApiService
    participant E as Express Server
    participant D as DataService
    participant R as Redis Cache
    participant M as MongoDB

    U->>C: Interact (filter / paginate / sort)
    C->>A: GET /revenue?startDate=...&endDate=...
    A->>E: HTTP request + JWT
    E->>E: auth + validation middleware
    E->>D: fetchRevenue(params)
    D->>R: GET cache key
    alt cache hit
        R-->>D: cached payload
    else cache miss
        D->>M: query
        M-->>D: documents
        D->>R: SET cache key + TTL
    end
    D-->>E: normalized result
    E-->>A: 200 JSON { success: true, data }
    A-->>C: data + pagination
    C-->>U: render charts / tables
```

## 3. Real-Time Update Sequence (WebSocket)

```mermaid
sequenceDiagram
    participant C as Dashboard Component
    participant W as WebSocketService
    participant S as Socket.io Server
    participant D as DataService

    C->>W: connect wss://api.dashboard.com/ws + JWT
    W->>S: handshake
    S-->>W: connected event
    W-->>C: onopen
    loop on data change
        D->>S: publish dataUpdate
        S->>W: push { type: dataUpdate, payload }
        W->>C: onmessage → updateDashboard(payload)
    end
    W->>S: reconnect with backoff on disconnect
```

## 4. Class / Module Overview (simplified UML)

```mermaid
classDiagram
    class ApiService {
        +String baseURL
        +Map cache
        +request(endpoint, options)
        +getUsers(params)
        +getRevenue(params)
        +getOrders(params)
    }
    class WebSocketService {
        +String url
        +connect()
        +onMessage(handler)
        +reconnect()
    }
    class Dashboard {
        +render()
        +updateDashboard(payload)
    }
    class MetricsCard {
        +String title
        +Number value
        +render()
    }
    class ChartContainer {
        +Array data
        +render()
    }
    class DataService {
        +fetchUsers()
        +fetchRevenue()
        +fetchOrders()
    }
    class CacheService {
        +get(key)
        +set(key, value, ttl)
    }
    Dashboard --> ApiService
    Dashboard --> WebSocketService
    Dashboard *-- MetricsCard
    Dashboard *-- ChartContainer
    ApiService --> DataService : HTTP
    WebSocketService --> DataService : WS push
    DataService --> CacheService
```

See also:

- [System Architecture](./system-architecture.md)
- [API Documentation](./api-documentation.md)
