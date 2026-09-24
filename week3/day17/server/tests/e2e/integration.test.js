// Day 14, Task 2: End-to-End Integration Tests.
// Covers the complete user journey across the hybrid store
// (Mongo users/auth, Postgres products/orders), cross-system error handling,
// and basic performance characteristics.
//
// Run: npm run test:e2e   (requires MongoDB + PostgreSQL running)
const request = require("supertest");
const app = require("../../app");
const User = require("../../models/User");
const { connectAll, disconnectAll, postgresql } = require("../helpers/db");

const stamp = Date.now();
const ADMIN_EMAIL = `e2e-admin-${stamp}@test.com`;
const USER_EMAIL = `e2e-user-${stamp}@test.com`;
const PASSWORD = "Strong1!Pass";
const PRODUCT = {
  name: "E2E Test Headphones",
  description: "End-to-end test product with a long enough description",
  price: 199.99,
  category: "E2E",
  stock: 25,
};

describe("End-to-End Integration Tests", () => {
  let adminToken;
  let userToken;
  let userId;
  let productId;
  let orderId;
  const createdProductIds = [];

  beforeAll(async () => {
    await connectAll();

    // Seed an admin. NOTE: public /auth/register accepts `role`, so any
    // caller can self-promote — flagged as a hardening item (see summary).
    const adminRes = await request(app).post("/api/v1/auth/register").send({
      name: "E2E Admin",
      email: ADMIN_EMAIL,
      password: PASSWORD,
      role: "admin",
    });
    expect(adminRes.status).toBe(201);
    adminToken = adminRes.body.data.accessToken;
  }, 30000);

  afterAll(async () => {
    // FK order matters: order_items restrict product deletes, so children first.
    if (orderId) {
      await postgresql
        .query("DELETE FROM order_items WHERE order_id = $1", [orderId])
        .catch(() => {});
      await postgresql
        .query("DELETE FROM orders WHERE id = $1", [orderId])
        .catch(() => {});
    }
    for (const pid of createdProductIds) {
      await postgresql
        .query("DELETE FROM order_items WHERE product_id = $1", [pid])
        .catch(() => {});
      await postgresql.query("DELETE FROM products WHERE id = $1", [pid]).catch(() => {});
    }
    await User.deleteMany({ email: { $in: [ADMIN_EMAIL, USER_EMAIL] } }).catch(
      () => {},
    );
    await disconnectAll();
  }, 30000);

  describe("Complete User Journey", () => {
    test("user registers and receives tokens", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "E2E User",
        email: USER_EMAIL,
        password: PASSWORD,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(USER_EMAIL);
      expect(res.body.data.accessToken).toBeDefined();
      userId = res.body.data.user.id;
    });

    test("user logs in with valid credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: USER_EMAIL, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      userToken = res.body.data.accessToken;
      expect(userToken).toBeDefined();
    });

    test("user browses the product catalog (public)", async () => {
      const res = await request(app).get("/api/v1/products");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toBeDefined();
      expect(res.body.data.pagination).toBeDefined();
    });

    test("admin creates a product, user reads it back", async () => {
      const created = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(PRODUCT);

      expect(created.status).toBe(201);
      expect(created.body.data.id).toBeDefined();
      productId = created.body.data.id;
      createdProductIds.push(productId);

      const fetched = await request(app).get(`/api/v1/products/${productId}`);

      expect(fetched.status).toBe(200);
      expect(fetched.body.data.name).toBe(PRODUCT.name);
    });

    test("non-admin cannot create products", async () => {
      const res = await request(app)
        .post("/api/v1/products")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ ...PRODUCT, name: "Should Not Exist" });

      expect(res.status).toBe(403);
    });

    test("user places an order for the product", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          items: [{ productId, quantity: 2, price: PRODUCT.price }],
          shippingAddress: {
            street: "123 Test Street",
            city: "Test City",
            zipCode: "10001",
            country: "USA",
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.totalAmount).toBeCloseTo(PRODUCT.price * 2);
      orderId = res.body.data.id;
    });

    test("user sees their order in /orders/my", async () => {
      const res = await request(app)
        .get("/api/v1/orders/my")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      // /orders/my returns a plain array (not a paginated envelope)
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((o) => o.id === orderId)).toBe(true);
    });

    test("admin sees cross-database analytics", async () => {
      const res = await request(app)
        .get("/api/v1/analytics")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users).toBeGreaterThanOrEqual(2);
      expect(res.body.data.products).toBeGreaterThanOrEqual(1);
      expect(res.body.data.orders).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Error Handling", () => {
    test("401 when no token is sent", async () => {
      const res = await request(app).get("/api/v1/users");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe("Access token is required");
    });

    test("403 when a non-admin hits an admin route", async () => {
      const res = await request(app)
        .get("/api/v1/users")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe("Insufficient permissions");
    });

    test("400 with details on invalid registration", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        name: "x",
        email: "not-an-email",
        password: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.details).toBeDefined();
    });

    test("401 on wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: USER_EMAIL, password: "Wrong1!Pass" });

      expect(res.status).toBe(401);
      expect(res.body.error.message).toBe("Invalid credentials");
    });

    test("404 for unknown user id shape", async () => {
      const res = await request(app)
        .get("/api/v1/users/invalid-id")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.message).toBe("User not found");
    });

    test("400 for malformed product UUID", async () => {
      const res = await request(app).get("/api/v1/products/not-a-uuid");

      expect(res.status).toBe(400);
    });
  });

  describe("Performance", () => {
    test("handles concurrent catalog reads", async () => {
      const reqs = Array(10)
        .fill()
        .map(() => request(app).get("/api/v1/products"));
      const responses = await Promise.all(reqs);

      responses.forEach((res) => expect(res.status).toBe(200));
    });

    test("responds within acceptable time", async () => {
      const start = Date.now();
      await request(app).get("/api/v1/products");
      expect(Date.now() - start).toBeLessThan(1000);
    });
  });
});
