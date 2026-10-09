const Stripe = require('stripe');
require('dotenv').config();

(async ()=>{
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET);
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_local_12345';

    const session = {
      id: 'cs_test_123',
      object: 'checkout.session',
      metadata: { paymentId: process.argv[2] || '' }
    };

    const event = {
      id: 'evt_test_123',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: session }
    };

    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

    console.log('Sending webhook to http://localhost:5000/api/payments/webhook');
    const res = await fetch('http://localhost:5000/api/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': header
      },
      body: payload
    });

    console.log('Webhook response status:', res.status);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error(err);
  }
})();