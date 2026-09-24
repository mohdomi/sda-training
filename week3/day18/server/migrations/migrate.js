const postgresql = require("../database/postgresql");
const migration001 = require("./001_create_users_table");
const migration002 = require("./002_create_products_table");
const migration003 = require("./003_create_orders_tables");

const migrations = [migration001, migration002, migration003];

async function migrate(direction = "up") {
  await postgresql.connect();

  for (const migration of migrations) {
    await migration[direction]();
  }

  await postgresql.disconnect();
  console.log(`All migrations completed: ${direction}`);
}

const direction = process.argv[2] || "up";

migrate(direction).catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});

module.exports = { migrate };
