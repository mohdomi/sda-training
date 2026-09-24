# Database Architecture Guide

## Hybrid Database Strategy

- **MongoDB**: Document storage for flexible schemas (`models/User.js` via Mongoose, connection in `database/mongodb.js`)
- **PostgreSQL**: Relational data with ACID properties (`models/Product.js` via `pg` pool, connection in `database/postgresql.js`, schema in `migrations/`)
- **Use Case Analysis**: MongoDB for users and profiles with nested preferences that change shape; PostgreSQL for products, orders, order items, and reviews where joins, constraints, and aggregates matter
- **Data Consistency**: Eventual consistency on MongoDB documents; strong consistency on PostgreSQL transactions and foreign keys
- **Performance**: Query optimization and indexing on both stores (see below)

## MongoDB Best Practices

- **Schema Design**: Embedded subdocuments for `preferences` and `profile`; referenced documents avoided here to keep reads single-round-trip
- **Indexing**: Single field index on `email` (unique); compound index on `role`, `isActive`, `createdAt` for admin listing and filtering
- **Query Optimization**: Lean filters (`findOne({ email, isActive: true })`), aggregation pipeline in `getUserStats()` grouping by role
- **Connection Management**: Single `MongoDBConnection` instance with `maxPoolSize: 10`, timeouts, and `error` / `disconnected` / `reconnected` handlers
- **Data Modeling**: Validation in schema (email regex, password min length, role enum), `pre('save')` bcrypt hashing, instance methods (`comparePassword`, `generateAuthToken`), statics (`findByCredentials`, `getUserStats`)

## PostgreSQL Best Practices

- **Schema Design**: Normalized tables `users`, `products`, `orders`, `order_items`, `reviews`; `order_items` and `reviews` reference `products`, `order_items` references `orders` with `ON DELETE CASCADE`
- **Indexing**: B-tree indexes on `users(email, role, is_active, created_at)`, `products(category, price, is_active, created_at)`, `orders(user_id, status)`, `order_items(order_id, product_id)`, `reviews(product_id)`; `CHECK` constraints enforce `price >= 0`, `stock >= 0`, `rating 1-5`, status enums
- **Query Optimization**: Parameterized `$1` queries, conditional `WHERE` builder in `findAll()`, `GROUP BY` with `COUNT` / `AVG` for order count and rating, `EXPLAIN ANALYZE` for slow joins
- **Connection Management**: Single `PostgreSQLConnection` with `pg.Pool` (`max: 20`, idle/connection timeouts), test query on connect, `pool.on('error')` handler, timed `query(text, params)` wrapper, `getClient()` for transactions
- **Data Integrity**: `UNIQUE`, `NOT NULL`, `CHECK`, foreign keys, `JSONB` for `tags`, `preferences`, `profile`, `shipping_address`; schema versioned through `migrations/001-003` run by `migrations/migrate.js`
