const request = require('supertest');
const createApp = require('../app');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const WebhookEvent = require('../models/WebhookEvent');

// Mock stripe as in other tests
jest.mock('stripe', () => {
  return function (secret) {
    return {
      webhooks: {
        constructEvent: jest.fn((rawBody, sig, secretKey) => {
          try {
            const body = JSON.parse(rawBody.toString());
            return body;
          } catch (e) {
            throw new Error('Invalid payload');
          }
        }),
      },
      paymentIntents: {
        retrieve: jest.fn(async (id) => ({ id, charges: { data: [{ id: 'ch_test_123' }] } })),
      },
    };
  };
});

let app;

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
  process.env.STRIPE_SECRET = 'sk_test_dummy';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
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

describe('Webhook idempotency', () => {
  test('same Stripe event posted twice should be processed only once', async () => {
    const payment = await Payment.create({ user: new mongoose.Types.ObjectId(), gig: 'gig123', amount: 30, currency: 'USD', provider: 'stripe', status: 'pending' });

    const evt = {
      id: 'evt_dup_1',
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_dup_1', metadata: { paymentId: payment._id.toString() }, payment_intent: 'pi_dup_1' } }
    };

    // first post
    const r1 = await request(app).post('/api/payments/webhook').set('stripe-signature', 'sig1').send(evt);
    expect(r1.statusCode).toBe(200);
    const p1 = await Payment.findById(payment._id);
    expect(p1.status).toBe('paid');

    // ensure webhook event recorded
    const rec = await WebhookEvent.findOne({ provider: 'stripe', eventId: 'evt_dup_1' });
    expect(rec).toBeTruthy();

    // post again
    const r2 = await request(app).post('/api/payments/webhook').set('stripe-signature', 'sig1').send(evt);
    expect(r2.statusCode).toBe(200);
    // duplicate flag may be present or not depending on race mode; if present it should be true
    if (typeof r2.body.duplicate !== 'undefined') {
      expect(r2.body.duplicate).toBe(true);
    }

    // payment should still be paid and no duplicate webhook events created (unique index enforces)
    const events = await WebhookEvent.find({ provider: 'stripe', eventId: 'evt_dup_1' });
    expect(events.length).toBe(1);
  });
});
