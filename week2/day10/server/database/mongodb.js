const mongoose = require("mongoose");
const { logger } = require("../middleware/errorHandler.js");

class MongoDBConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      const mongoUri =
        process.env.MONGODB_URI || "mongodb://localhost:27017/sda-training";

      this.connection = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
      });

      this.isConnected = true;

      logger.info("MongoDB connected successfully");

      mongoose.connection.on("error", (error) => {
        logger.error("MongoDB connection error : ", error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB disconnected");
        this.isConnected = false;
      });

      mongoose.connection.on("reconnected", () => {
        logger.info("MongoDB reconnected");
        this.isConnected = true;
      });
    } catch (error) {
      logger.error("MongoDB connection failed : ", error);
      throw error;
    }
  }
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info("MongoDB disconnected");
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
    };
  }
}

module.exports = new MongoDBConnection();
