const request = require('supertest');
const createApp = require('../app');
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Payment = require('../models/Payment');

// Mock stripe module before app is required
jest.mock('stripe', () => {
  return function (secret) {
    return {
      webhooks: {
        constructEvent: jest.fn((rawBody, sig, secretKey) => {
          // rawBody is Buffer; parse JSON
          try {
            const body = JSON.parse(rawBody.toString());
            return body; // tests will pass a prebuilt event as body
          } catch (e) {
            throw new Error('Invalid payload');
          }
        }),
      },
      paymentIntents: {
        retrieve: jest.fn(async (id) => {
          // return a fake PaymentIntent with charge id
          return { id, charges: { data: [{ id: 'ch_test_123' }] } };
        }),
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

describe('Payments webhook reconciliation', () => {
  test('checkout.session.completed should update payment providerData and mark paid; refund should mark refunded', async () => {
    // Create a payment record to be referenced by webhook metadata
    const payment = await Payment.create({ user: new mongoose.Types.ObjectId(), gig: 'gig123', amount: 50, currency: 'USD', provider: 'stripe', status: 'pending' });

    // Build fake checkout.session.completed event
    const sessionEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          metadata: { paymentId: payment._id.toString() },
          payment_intent: 'pi_test_123',
        },
      },
    };

    // POST webhook (app route expects raw body and stripe-signature header)
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'totsig')
      .send(sessionEvent);

    expect(res.statusCode).toBe(200);

    // Reload payment
    const updated = await Payment.findById(payment._id);
    expect(updated.status).toBe('paid');
    expect(updated.providerData).toBeDefined();
    expect(updated.providerData.paymentIntentId).toBe('pi_test_123');
    // charge id comes from mocked paymentIntents.retrieve
    expect(updated.providerData.chargeId).toBe('ch_test_123');

    // Now simulate a refund event (charge.refunded)
    const refundEvent = {
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_123',
          payment_intent: 'pi_test_123',
          // refund object sample
          refunds: { data: [{ id: 're_test_123' }] },
        },
      },
    };

    const r2 = await request(app)
      .post('/api/payments/webhook')
      .set('stripe-signature', 'totsig')
      .send(refundEvent);

    expect(r2.statusCode).toBe(200);

    const refunded = await Payment.findById(payment._id);
    expect(refunded.status).toBe('refunded');
    expect(refunded.escrowStatus).toBe('refunded');
  }, 20000);
});
