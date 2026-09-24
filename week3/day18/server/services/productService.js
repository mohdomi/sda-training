const EventEmitter = require("events");
const Product = require("../models/Product");
const postgresql = require("../database/postgresql");

// PostgreSQL-backed ProductService. Single source of truth for catalog is
// Postgres (migrations 002). Same public method names as before so routes
// and the frontend don't change.
class ProductService extends EventEmitter {
  async initialize() {
    console.log("ProductService initialized (postgres)");
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on("product:created", (product) => {
      console.log(`Product created : ${product.name}`);
    });
    this.on("product:updated", (product) => {
      console.log(`Product updated : ${product.name}`);
    });
    this.on("product:deleted", (productId) => {
      console.log(`Product deleted : ${productId}`);
    });
  }

  serialize(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      price: Number(row.price),
      description: row.description || "",
      stock: Number(row.stock ?? 0),
      category: row.category,
      imageUrl: row.image_url ?? row.imageUrl ?? null,
      tags: row.tags ?? [],
      isActive: row.is_active ?? row.isActive ?? true,
      createdAt: row.created_at ?? row.createdAt,
      updatedAt: row.updated_at ?? row.updatedAt,
    };
  }

  async createProduct(productData) {
    const { name, price, description, stock = 0, category } = productData;
    if (!name || price === undefined || !category) {
      throw new Error("Missing required fields");
    }
    if (typeof Number(price) !== "number" || Number(price) < 0 || Number.isNaN(Number(price))) {
      throw new Error("Invalid price");
    }
    const row = await Product.create({
      name,
      description: description || "",
      price: Number(price),
      category,
      stock: Number(stock) || 0,
      imageUrl: productData.imageUrl || null,
      tags: productData.tags || [],
    });
    const out = this.serialize(row);
    this.emit("product:created", out);
    return out;
  }

  async getProductById(productId) {
    const row = await Product.findById(productId);
    if (!row) throw new Error("Product not found");
    return this.serialize(row);
  }

  async updateProduct(productId, updateData) {
    const patch = { ...updateData };
    // map camelCase -> snake_case columns used by the PG model
    if (patch.imageUrl !== undefined) {
      patch.image_url = patch.imageUrl;
      delete patch.imageUrl;
    }
    if (patch.tags !== undefined && typeof patch.tags !== "string") {
      patch.tags = JSON.stringify(patch.tags);
    }
    delete patch.id;
    delete patch.createdAt;
    const row = await Product.update(productId, patch);
    if (!row) throw new Error("Product not found");
    const out = this.serialize(row);
    this.emit("product:updated", out);
    return out;
  }

  async deleteProduct(productId) {
    const row = await Product.delete(productId);
    if (!row) throw new Error("Product not found");
    this.emit("product:deleted", productId);
    return { message: "Product deleted successfully" };
  }

  async updateStock(productId, quantity) {
    const current = await Product.findById(productId);
    if (!current) throw new Error("Product not found");
    if (typeof quantity !== "number") throw new Error("Invalid quantity");
    const next = Number(current.stock) + quantity;
    if (next < 0) throw new Error("Insufficient stock");
    const row = await Product.update(productId, { stock: next });
    const out = this.serialize(row);
    this.emit("product:updated", out);
    return out;
  }

  async countFiltered({ category, minPrice, maxPrice, search }) {
    const conditions = [];
    const values = [];
    let n = 0;
    if (category) {
      n += 1;
      conditions.push(`p.category = $${n}`);
      values.push(category);
    }
    if (minPrice !== undefined && minPrice !== "") {
      n += 1;
      conditions.push(`p.price >= $${n}`);
      values.push(minPrice);
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      n += 1;
      conditions.push(`p.price <= $${n}`);
      values.push(maxPrice);
    }
    if (search) {
      n += 1;
      conditions.push(`(p.name ILIKE $${n} OR p.description ILIKE $${n})`);
      values.push(`%${search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const res = await postgresql.query(`SELECT COUNT(*)::int AS total FROM products p ${where}`, values);
    return res.rows[0].total;
  }

  async getAllProducts(filters = {}) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const sortMap = { createdAt: "created_at", updatedAt: "updated_at", name: "name", price: "price" };
    const rows = await Product.findAll({
      category: filters.category,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      search: filters.search,
      sortBy: sortMap[filters.sort] || "created_at",
      sortOrder: (filters.order || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC",
      limit,
      offset,
    });
    const total = await this.countFiltered(filters);
    return {
      products: rows.map((r) => this.serialize(r)),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}

module.exports = new ProductService();
