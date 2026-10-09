jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn(async ({ idToken }) => {
    if (idToken === 'valid_token') {
      return {
        getPayload: () => ({
          email: 'googleuser@example.com',
          name: 'Google User',
          sub: 'google-sub-id',
          email_verified: true,
        }),
      };
    }
    throw new Error('Invalid token');
  });

  return {
    OAuth2Client: function () {
      return { verifyIdToken };
    },
  };
});

const request = require('supertest');
const createApp = require('../app');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
  await connectDB();
  app = createApp();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (connectDB.__mongod) await connectDB.__mongod.stop();
});

describe('Google token login', () => {
  test('should create a new user and return token for a valid idToken', async () => {
    const res = await request(app)
      .post('/api/auth/google/token')
      .send({ idToken: 'valid_token', role: 'freelancer' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: 'googleuser@example.com', role: 'freelancer' });

    const user = await User.findOne({ email: 'googleuser@example.com' });
    expect(user).toBeTruthy();
    expect(user.googleId).toBe('google-sub-id');
    expect(user.isVerified).toBe(true);
  });

  test('should return 401 for invalid Google token', async () => {
    const res = await request(app).post('/api/auth/google/token').send({ idToken: 'invalid_token', role: 'client' });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});