const postgresql = require("../database/postgresql.js");

// PostgreSQL-backed Order model. Users live in MongoDB, so user_id is TEXT
// (Mongo ObjectId string) with NO foreign key — enforced at service layer.
// Product/order ids are native Postgres UUIDs.
class Order {
  constructor() {
    this.tableName = "orders";
    this.validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  }

  async create({ userId, items, shippingAddress = {}, totalAmount, status = "pending" }) {
    if (!userId || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing required fields");
    }
    if (!this.validStatuses.includes(status)) throw new Error("Invalid status");

    const calculated = items.reduce((sum, it) => {
      if (!it.productId || !it.quantity || it.price === undefined) {
        throw new Error("Invalid order item");
      }
      return sum + Number(it.quantity) * Number(it.price);
    }, 0);
    const total = totalAmount !== undefined ? Number(totalAmount) : calculated;

    const client = await postgresql.getClient();
    try {
      await client.query("BEGIN");
      const orderRes = await client.query(
        `INSERT INTO orders (user_id, total_amount, status, shipping_address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
        [String(userId), total, status, JSON.stringify(shippingAddress)],
      );
      const order = orderRes.rows[0];
      const createdItems = [];
      for (const it of items) {
        const r = await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price, created_at)
           VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
          [order.id, it.productId, it.quantity, it.price],
        );
        createdItems.push(r.rows[0]);
      }
      await client.query("COMMIT");
      return this._serialize(order, createdItems);
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const orderRes = await postgresql.query("SELECT * FROM orders WHERE id = $1", [id]);
    const order = orderRes.rows[0];
    if (!order) return null;
    const itemsRes = await postgresql.query(
      "SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC",
      [id],
    );
    return this._serialize(order, itemsRes.rows);
  }

  async findAll({ userId, status, page = 1, limit = 10 } = {}) {
    const conditions = [];
    const values = [];
    let n = 0;
    if (userId) {
      n += 1;
      conditions.push(`o.user_id = $${n}`);
      values.push(String(userId));
    }
    if (status) {
      n += 1;
      conditions.push(`o.status = $${n}`);
      values.push(status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const countRes = await postgresql.query(
      `SELECT COUNT(*)::int AS total FROM orders o ${where}`,
      values,
    );
    const total = countRes.rows[0].total;
    n += 1;
    const limitPh = `$${n}`;
    n += 1;
    const offsetPh = `$${n}`;
    const rowsRes = await postgresql.query(
      `SELECT * FROM orders o ${where} ORDER BY o.created_at DESC LIMIT ${limitPh} OFFSET ${offsetPh}`,
      [...values, limitNum, offset],
    );
    const orders = [];
    for (const o of rowsRes.rows) {
      const itemsRes = await postgresql.query(
        "SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC",
        [o.id],
      );
      orders.push(this._serialize(o, itemsRes.rows));
    }
    return {
      orders,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    };
  }

  async findByUser(userId) {
    const { orders } = await this.findAll({ userId, page: 1, limit: 100 });
    return orders;
  }

  async updateStatus(id, status) {
    if (!this.validStatuses.includes(status)) throw new Error("Invalid status");
    const res = await postgresql.query(
      "UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );
    const order = res.rows[0];
    if (!order) return null;
    const itemsRes = await postgresql.query(
      "SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC",
      [id],
    );
    return this._serialize(order, itemsRes.rows);
  }

  async cancel(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    if (existing.status === "delivered") {
      throw new Error("Delivered order cannot be cancelled");
    }
    return this.updateStatus(id, "cancelled");
  }

  _serialize(order, items) {
    return {
      id: order.id,
      userId: order.user_id,
      items: (items || []).map((i) => ({
        productId: i.product_id,
        quantity: Number(i.quantity),
        price: Number(i.price),
      })),
      totalAmount: Number(order.total_amount),
      status: order.status,
      shippingAddress: order.shipping_address || {},
      createdAt: order.created_at,
      updatedAt: order.updated_at,
    };
  }
}

module.exports = new Order();
