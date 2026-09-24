const express = require("express");
const cluster = require("cluster");
const os = require("os");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const userService = require("./services/userService.js");
const productService = require("./services/productService.js");
const orderService = require("./services/orderService.js");
const notificationService = require("./services/notificationService.js");

const { errorHandler } = require("./middleware/errorHandler");
const logger = require("./middleware/logger");
const { performanceMiddleware } = require("./middleware/performance");
const { generalLimiter } = require("./middleware/rateLimiting");
const { setupSwagger } = require("./middleware/swagger");
const passport = require("./middleware/oauth");

const v1Router = require("./routes/api/v1");
const notificationRoutes = require("./routes/api/v1/notificationRoutes");
const healthRoutes = require("./routes/api/v1/healthRoutes");

class Application {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });
    this.port = process.env.PORT || 3000;
    this.isProduction = process.env.NODE_ENV === "production";
  }

  async initialize() {
    try {
      await this.setupMiddleware();
      await this.setupRoutes();
      await this.setupServices();
      await this.setupWebSocket();
      await this.setupErrorHandling();
      await this.startServer();
    } catch (err) {
      console.error("Application initialization failed : ", err);
      process.exit(1);
    }
  }

  async setupMiddleware() {
    this.app.use(helmet());
    this.app.use(morgan("combined"));

    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
      }),
    );

    this.app.use(compression());

    this.app.use("/api/", generalLimiter);

    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: "10mb",
        parameterLimit: 1000,
      }),
    );
    this.app.use(performanceMiddleware);

    this.app.use(logger);
    this.app.use(passport.initialize());
  }

  async setupRoutes() {
    this.app.use("/health", healthRoutes);
    this.app.use("/api/v1", v1Router);
    this.app.use("/api/v1/notifications", notificationRoutes);
    setupSwagger(this.app);

    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: "Route not found",
      });
    });
  }

  async setupServices() {
    await userService.initialize();
    await productService.initialize();
    await orderService.initialize();
    await notificationService.initialize();

    console.log("All services initialized successfully");
  }

  setupWebSocket() {
    this.io.on("connection", (socket) => {
      console.log("Client connected : ", socket.id);

      socket.on("join", (room) => {
        socket.join(room);
        console.log(`Client ${socket.id} joined room ${room}`);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected from the room");
      });

      socket.on("user:update", (data) => {
        socket.broadcast.emit("user:updated", data);
      });

      socket.on("order:create", (data) => {
        socket.broadcast.emit("order:created", data);
      });
    });
  }

  setupErrorHandling() {
    this.app.use(errorHandler);

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at : ", promise, "reason : ", reason);
      process.exit(1);
    });

    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception : ", error);
      process.exit(1);
    });
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`Server is running on port : ${this.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Process ID: ${process.pid}`);
    });
  }
}

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;

  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died.`);
    console.log("Starting a new Worker");
    cluster.fork();
  });

  process.on("SIGTERM", () => {
    console.log("Master received SIGTERM, shutting down gracefully.");
    for (const id in cluster.workers) {
      cluster.workers[id].kill();
    }
  });
} else {
  const app = new Application();
  app.initialize();
}

module.exports = Application;
