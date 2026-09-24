const postgresql = require("../database/postgresql.js");

class Product {
  constructor() {
    this.tableName = "products";
  }

  async create(productData) {
    const { name, description, price, category, stock, imageUrl, tags } =
      productData;

    const query = `
      INSERT INTO products (name, description, price, category, stock, image_url, tags, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      name,
      description,
      price,
      category,
      stock,
      imageUrl,
      JSON.stringify(tags),
    ];
    const result = await postgresql.query(query, values);

    return result.rows[0];
  }

  async findById(id) {
    const query = `
      SELECT p.*, 
             COUNT(o.id) as order_count,
             AVG(r.rating) as average_rating
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await postgresql.query(query, [id]);
    return result.rows[0];
  }

  async findAll(filters = {}) {
    let query = `
      SELECT p.*, 
             COUNT(o.id) as order_count,
             AVG(r.rating) as average_rating
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN reviews r ON p.id = r.product_id
    `;

    const conditions = [];
    const values = [];
    let paramCount = 0;

    if (filters.category) {
      paramCount++;
      conditions.push(`p.category = $${paramCount}`);
      values.push(filters.category);
    }

    if (filters.minPrice) {
      paramCount++;
      conditions.push(`p.price >= $${paramCount}`);
      values.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      paramCount++;
      conditions.push(`p.price <= $${paramCount}`);
      values.push(filters.maxPrice);
    }

    if (filters.search) {
      paramCount++;
      conditions.push(
        `(p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`,
      );
      values.push(`%${filters.search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` GROUP BY p.id`;

    if (filters.sortBy) {
      const sortOrder = filters.sortOrder || "ASC";
      query += ` ORDER BY p.${filters.sortBy} ${sortOrder}`;
    } else {
      query += ` ORDER BY p.created_at DESC`;
    }

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const result = await postgresql.query(query, values);
    return result.rows;
  }

  async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        paramCount++;
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    paramCount++;
    values.push(id);

    const query = `
      UPDATE products
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await postgresql.query(query, values);
    return result.rows[0];
  }

  async delete(id) {
    const query = "DELETE FROM products WHERE id = $1 RETURNING *";
    const result = await postgresql.query(query, [id]);
    return result.rows[0];
  }

  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        AVG(price) as average_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(stock) as total_stock
      FROM products
    `;

    const result = await postgresql.query(query);
    return result.rows[0];
  }

  async getCategoryStats() {
    const query = `
      SELECT 
        category,
        COUNT(*) as product_count,
        AVG(price) as average_price,
        SUM(stock) as total_stock
      FROM products
      GROUP BY category
      ORDER BY product_count DESC
    `;

    const result = await postgresql.query(query);
    return result.rows;
  }
}

module.exports = new Product();
