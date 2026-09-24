# System Architecture — Day 14 (as built)

```mermaid
graph TB
    subgraph Frontend ["Frontend (Vite + React, :5173)"]
        UI[Pages: Dashboard, Products, Orders, Users, Profile]
        API[services/api.js<br/>JWT + refresh retry]
    end

    subgraph Gateway ["API Gateway (Express, :3000)"]
        H[helmet + CORS + compression + morgan]
        RL[generalLimiter on /api/]
        MON[monitoringMiddleware<br/>per-route timing + error rate]
        CACHE[cache middleware<br/>GET /products*, /analytics]
    end

    subgraph Auth ["Auth (MongoDB-backed)"]
        JWT[authService<br/>access + refresh JWT]
        AUTHN[authenticate middleware]
        AUTHZ[authorize / RBAC]
    end

    subgraph Domain ["Business Logic"]
        US[userRoutes → Mongoose User]
        PS[productService → PG Product model]
        OS[orderService → PG Order model]
        NS[notificationService → Mongoose Notification]
        AN[analyticsRoutes<br/>counts across both DBs]
    end

    subgraph Data ["Data Layer"]
        MG[(MongoDB<br/>users, notifications)]
        PG[(PostgreSQL<br/>products, orders, order_items)]
        RD[(Redis<br/>hot-read cache)]
    end

    UI --> API
    API --> H
    H --> RL --> MON --> CACHE
    CACHE --> AUTHN
    AUTHN --> AUTHZ
    AUTHZ --> US & PS & OS & NS & AN
    US --> MG
    NS --> MG
    PS --> PG
    OS --> PG
    AN --> MG & PG
    CACHE -.-> RD
```

Notes on the mapping (the part worth learning): each store owns one domain —
documents where the shape is flexible (users, notifications → Mongo),
relations + transactions where integrity matters (catalog, orders → Postgres),
ephemeral hot reads (Redis, degrades gracefully when down). Cross-database
references (Postgres `orders.user_id` → Mongo user id) are `TEXT`, never
foreign keys — enforced in service code. `/health` is public,
`/health/metrics` is admin-only.
