const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");

class OrderService extends EventEmitter {
  constructor() {
    super();

    this.orders = new Map();
  }

  async initialize() {
    console.log("OrderService initialized");
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
    try {
      const { userId, items, totalAmount } = orderData;

      if (!userId || !items || !Array.isArray(items) || items.length === 0) {
        throw new Error("Missing required fields");
      }

      const calculatedTotal = items.reduce((sum, item) => {
        if (!item.productId || !item.quantity || !item.price) {
          throw new Error("Invalid order item");
        }
        return sum + item.quantity * item.price;
      }, 0);

      const order = {
        id: uuidv4(),
        userId,
        items,
        totalAmount: totalAmount !== undefined ? totalAmount : calculatedTotal,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.orders.set(order.id, order);

      this.emit("order:created", order);

      return {
        id: order.id,
        userId: order.userId,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      };
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  async getOrderById(orderId) {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    return {
      id: order.id,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  async updateOrderStatus(orderId, status) {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      throw new Error("Invalid status");
    }

    order.status = status;
    order.updatedAt = new Date();
    this.orders.set(order.id, order);

    this.emit("order:updated", order);

    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      updatedAt: order.updatedAt,
    };
  }

  async cancelOrder(orderId) {
    const order = this.orders.get(orderId);

    if (!order) {
      throw new Error("Order not found");
    }

    if (order.status === "delivered") {
      throw new Error("Delivered order cannot be cancelled");
    }

    order.status = "cancelled";
    order.updatedAt = new Date();
    this.orders.set(order.id, order);

    this.emit("order:cancelled", orderId);

    return {
      message: "Order cancelled successfully",
    };
  }

  async getOrdersByUser(userId) {
    const orders = Array.from(this.orders.values()).filter((o) => o.userId === userId);

    return orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((order) => ({
        id: order.id,
        userId: order.userId,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      }));
  }

  async getAllOrders(filters = {}) {
    let orders = Array.from(this.orders.values());

    if (filters.userId) {
      orders = orders.filter((o) => o.userId === filters.userId);
    }

    if (filters.status) {
      orders = orders.filter((o) => o.status === filters.status);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const total = orders.length;
    const paginatedOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .map((order) => ({
        id: order.id,
        userId: order.userId,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      }));

    return {
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}

module.exports = new OrderService();
