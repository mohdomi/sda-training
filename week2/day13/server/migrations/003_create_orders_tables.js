const postgresql = require("../database/postgresql");

async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
      shipping_address JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
  `;

  await postgresql.query(query);
  console.log("Orders tables created successfully");
}

async function down() {
  const query = `
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
  `;
  await postgresql.query(query);
  console.log("Orders tables dropped successfully");
}

module.exports = { up, down };
