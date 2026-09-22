const postgresql = require("../database/postgresql");

async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      category VARCHAR(50) NOT NULL,
      stock INTEGER DEFAULT 0 CHECK (stock >= 0),
      image_url VARCHAR(500),
      tags JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
    CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
    CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);
  `;

  await postgresql.query(query);
  console.log("Products table created successfully");
}

async function down() {
  const query = "DROP TABLE IF EXISTS products CASCADE";
  await postgresql.query(query);
  console.log("Products table dropped successfully");
}

module.exports = { up, down };
