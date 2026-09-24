const EventEmitter = require("events");
const Order = require("../models/Order");

// PostgreSQL-backed OrderService. Single source of truth for orders is
// Postgres (migrations 003). userId is the Mongo ObjectId string (TEXT).
// Same public method names as before so routes and frontend don't change.
class OrderService extends EventEmitter {
  async initialize() {
    console.log("OrderService initialized (postgres)");
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on("order:created", (order) => {
      console.log(`Order created : ${order.id}`);
    });
    this.on("order:updated", (order) => {
      console.log(`Order updated : ${order.id}`);
    });
    this.on("order:cancelled", (orderId) => {
      console.log(`Order cancelled : ${orderId}`);
    });
  }

  async createOrder(orderData) {
    const { userId, items, shippingAddress, totalAmount, status } = orderData;
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      throw new Error("Missing required fields");
    }
    const order = await Order.create({
      userId: String(userId),
      items,
      shippingAddress: shippingAddress || {},
      totalAmount,
      status: status || "pending",
    });
    this.emit("order:created", order);
    return order;
  }

  async getOrderById(orderId) {
    const order = await Order.findById(orderId);
    if (!order) throw new Error("Order not found");
    return order;
  }

  async updateOrderStatus(orderId, status) {
    const order = await Order.updateStatus(orderId, status);
    if (!order) throw new Error("Order not found");
    this.emit("order:updated", order);
    return order;
  }

  async cancelOrder(orderId) {
    const existing = await Order.findById(orderId);
    if (!existing) throw new Error("Order not found");
    const order = await Order.cancel(orderId);
    this.emit("order:cancelled", orderId);
    return { message: "Order cancelled successfully" };
  }

  async getOrdersByUser(userId) {
    return Order.findByUser(String(userId));
  }

  async getAllOrders(filters = {}) {
    return Order.findAll({
      userId: filters.userId ? String(filters.userId) : undefined,
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
    });
  }
}

module.exports = new OrderService();
