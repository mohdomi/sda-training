const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");

class ProductService extends EventEmitter {
  constructor() {
    super();

    this.products = new Map();
  }

  async initialize() {
    console.log("ProductService initialized");
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

  async createProduct(productData) {
    try {
      const { name, price, description, stock = 0, category } = productData;

      if (!name || price === undefined || !category) {
        throw new Error("Missing required fields");
      }

      if (typeof price !== "number" || price < 0) {
        throw new Error("Invalid price");
      }

      const product = {
        id: uuidv4(),
        name,
        price,
        description: description || "",
        stock,
        category,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      this.products.set(product.id, product);

      this.emit("product:created", product);

      return {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        stock: product.stock,
        category: product.category,
        createdAt: product.createdAt,
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  }

  async getProductById(productId) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      stock: product.stock,
      category: product.category,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async updateProduct(productId, updateData) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    Object.assign(product, updateData, { updatedAt: new Date() });
    this.products.set(product.id, product);

    this.emit("product:updated", product);

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      stock: product.stock,
      category: product.category,
      updatedAt: product.updatedAt,
    };
  }

  async deleteProduct(productId) {
    const product = this.products.get(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    this.products.delete(productId);

    this.emit("product:deleted", productId);

    return {
      message: "Product deleted successfully",
    };
  }

  async updateStock(productId, quantity) {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (typeof quantity !== "number") {
      throw new Error("Invalid quantity");
    }

    if (product.stock + quantity < 0) {
      throw new Error("Insufficient stock");
    }

    product.stock += quantity;
    product.updatedAt = new Date();
    this.products.set(product.id, product);

    this.emit("product:updated", product);

    return {
      id: product.id,
      name: product.name,
      stock: product.stock,
      updatedAt: product.updatedAt,
    };
  }

  async getAllProducts(filters = {}) {
    let products = Array.from(this.products.values());

    if (filters.category) {
      products = products.filter((p) => p.category === filters.category);
    }

    if (filters.isActive !== undefined) {
      products = products.filter((p) => p.isActive === filters.isActive);
    }

    if (filters.minPrice !== undefined) {
      products = products.filter((p) => p.price >= parseFloat(filters.minPrice));
    }

    if (filters.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= parseFloat(filters.maxPrice));
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const total = products.length;
    const paginatedProducts = products
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        stock: product.stock,
        category: product.category,
        createdAt: product.createdAt,
      }));

    return {
      products: paginatedProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new ProductService();
