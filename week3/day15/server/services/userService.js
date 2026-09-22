const EventEmitter = require("events");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class UserService extends EventEmitter {
  constructor() {
    super();

    this.users = new Map();
    this.sessions = new Map();
    this.jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";
  }

  async initialize() {
    console.log("UserService initialized");
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.on("user:created", (user) => {
      console.log(`User created : ${user.email}`);
    });

    this.on("user:updated", (user) => {
      console.log(`User updated : ${user.email}`);
    });

    this.on("user:deleted", (userId) => {
      console.log(`User deleted : ${userId}`);
    });
  }

  async createUser(userData) {
    try {
      const { email, password, name, role = "user" } = userData;

      if (!email || !password || !name) {
        throw new Error("Missing required fields");
      }

      if (this.users.has(email)) {
        throw new Error("User already exists");
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = {
        id: uuidv4(),
        email,
        password: hashedPassword,
        name,
        role,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      this.users.set(email, user);

      this.emit("user:created", user);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      };
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async authenticateUser(email, password) {
    try {
      const user = this.users.get(email);
      if (!user) {
        throw new Error("User not found");
      }

      if (!user.isActive) {
        throw new Error("User account is deactivated");
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error("Invalid password");
      }

      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn }
      );

      this.sessions.set(user.id, {
        token,
        createdAt: new Date(),
        lastActivity: new Date(),
      });

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    } catch (error) {
      console.error("Error authenticating user:", error);
      throw error;
    }
  }

  async getUserById(userId) {
    const user = Array.from(this.users.values()).find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateUser(userId, updateData) {
    const user = Array.from(this.users.values()).find((u) => u.id === userId);
    if (!user) {
      throw new Error("User not found");
    }

    Object.assign(user, updateData, { updatedAt: new Date() });
    this.users.set(user.email, user);

    this.emit("user:updated", user);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      updatedAt: user.updatedAt,
    };
  }

  async deleteUser(userId) {
    const user = Array.from(this.users.values()).find((u) => u.id === userId);

    if (!user) {
      throw new Error("User not found");
    }

    this.users.delete(user.email);
    this.sessions.delete(userId);

    this.emit("user:deleted", userId);

    return {
      message: "User deleted successfully",
    };
  }

  async getAllUsers(filters = {}) {
    let users = Array.from(this.users.values());

    if (filters.role) {
      users = users.filter((u) => u.role === filters.role);
    }

    if (filters.isActive !== undefined) {
      users = users.filter((u) => u.isActive === filters.isActive);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const total = users.length;
    const paginatedUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit)
      .map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      }));

    return {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const session = this.sessions.get(decoded.userId);

      if (!session || session.token !== token) {
        throw new Error("Invalid token");
      }

      session.lastActivity = new Date();

      return decoded;
    } catch (error) {
      throw new Error("Invalid token");
    }
  }

  async logout(userId) {
    this.sessions.delete(userId);

    return {
      message: "Logged out successfully",
    };
  }
}

module.exports = new UserService();
