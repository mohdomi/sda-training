// Shared DB harness for e2e tests.
// Connects Mongo + Postgres, runs migrations (idempotent CREATE IF NOT EXISTS),
// and tears everything down. Redis is intentionally untouched: the cache
// middleware degrades gracefully when disconnected.
const mongoose = require("mongoose");
const postgresql = require("../../database/postgresql");
const migUsers = require("../../migrations/001_create_users_table");
const migProducts = require("../../migrations/002_create_products_table");
const migOrders = require("../../migrations/003_create_orders_tables");

async function connectAll() {
  const mongoUri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/sda-training";
  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  });
  await postgresql.connect();
  await migUsers.up();
  await migProducts.up();
  await migOrders.up();
}

async function disconnectAll() {
  await mongoose.disconnect().catch(() => {});
  await postgresql.disconnect().catch(() => {});
}

module.exports = { connectAll, disconnectAll, postgresql };
