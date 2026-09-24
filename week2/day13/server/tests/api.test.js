const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { authService } = require('../middleware/auth');

describe('API Endpoints', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: await authService.hashPassword('password123'),
      role: 'user'
    });
    await testUser.save();

    const tokens = await authService.generateTokens(testUser);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({ email: 'test@example.com' });
  });

  describe('Authentication', () => {
    test('POST /auth/register - should register a new user', async () => {
      const userData = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.accessToken).toBeDefined();
    });

    test('POST /auth/login - should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.accessToken).toBeDefined();
    });

    test('POST /auth/login - should fail with invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });
  });

  describe('Users API', () => {
    test('GET /users - should get users list', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    test('GET /users/:id - should get specific user', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUser._id.toString());
    });

    test('PUT /users/:id - should update user', async () => {
      const updateData = {
        name: 'Updated User'
      };

      const response = await request(app)
        .put(`/api/v1/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
    });

    test('DELETE /users/:id - should delete user', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User deleted successfully');
    });
  });

  describe('Error Handling', () => {
    test('GET /users - should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Access token is required');
    });

    test('GET /users/invalid-id - should return 404 for invalid user', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('User not found');
    });
  });
});
