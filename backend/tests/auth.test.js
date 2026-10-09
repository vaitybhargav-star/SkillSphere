const request = require('supertest');
const createApp = require('../app');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');

// increase Jest timeout for slower operations (db startups, email flows)
jest.setTimeout(15000);

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (connectDB.__mongod) {
    await connectDB.__mongod.stop();
  }
});

describe('Auth routes', () => {
  test('should register and login a user', async () => {
    const registerRes = await request(app).post('/api/auth/register').send({ fullName: 'Test User', email: 'test@example.com', password: 'password123' });
    expect(registerRes.statusCode).toBe(201);
    // Some deployments require email verification on register; if there is no token, mark user verified and login
    let token = registerRes.body.token;
    expect(registerRes.body.user).toMatchObject({ fullName: 'Test User', email: 'test@example.com', role: 'client' });

    if (!token) {
      await User.findOneAndUpdate({ email: 'test@example.com' }, { isVerified: true });
      const loginRes = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
      expect(loginRes.statusCode).toBe(200);
      token = loginRes.body.token;
    } else {
      const loginRes = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'password123' });
      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    }

    expect(token).toBeTruthy();
  });

  test('should prevent password login for Google-only users and return a helpful error', async () => {
    const googleUser = await User.create({
      fullName: 'Google Only',
      email: 'google-only@example.com',
      googleId: 'google-1234',
      isVerified: true,
      role: 'client',
    });

    const loginResponse = await request(app).post('/api/auth/login').send({
      email: googleUser.email,
      password: 'any-password',
    });

    expect(loginResponse.statusCode).toBe(403);
    expect(loginResponse.body).toMatchObject({
      success: false,
      message: 'This account was created through Google login. Please sign in with Google or reset your password.',
    });
  });

  test('should fetch and update profile using valid token', async () => {
    const registerResponse = await request(app).post('/api/auth/register').send({ fullName: 'Update User', email: 'update-test@example.com', password: 'password123' });
    let token = registerResponse.body.token;

    if (!token) {
      await User.findOneAndUpdate({ email: 'update-test@example.com' }, { isVerified: true });
      const loginRes = await request(app).post('/api/auth/login').send({ email: 'update-test@example.com', password: 'password123' });
      token = loginRes.body.token;
    }

    const profileRes = await request(app).get('/api/user/profile').set('Authorization', `Bearer ${token}`);
    expect(profileRes.statusCode).toBe(200);
    expect(profileRes.body.user).toMatchObject({ fullName: 'Update User', email: 'update-test@example.com' });

    const updateRes = await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Updated profile bio', phone: '+123456789' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.user).toHaveProperty('bio', 'Updated profile bio');
    expect(updateRes.body.user).toHaveProperty('phone', '+123456789');
  });
});
