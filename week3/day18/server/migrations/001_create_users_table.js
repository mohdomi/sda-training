const postgresql = require("../database/postgresql");

async function up() {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
      avatar_url VARCHAR(500),
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      preferences JSONB DEFAULT '{}',
      profile JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
  `;

  await postgresql.query(query);
  console.log("Users table created successfully");
}

async function down() {
  const query = "DROP TABLE IF EXISTS users CASCADE";
  await postgresql.query(query);
  console.log("Users table dropped successfully");
}

module.exports = { up, down };
