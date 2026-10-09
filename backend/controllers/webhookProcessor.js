const Payment = require('../models/Payment');
const { createNotification } = require('./notificationController');

let stripe = null;
if (process.env.STRIPE_SECRET) {
  try {
    stripe = require('stripe')(process.env.STRIPE_SECRET);
  } catch (e) {
    stripe = null;
    console.warn('Stripe init failed in webhookProcessor:', e.message);
  }
}

let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  try {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
  } catch (e) {
    razorpay = null;
    console.warn('Razorpay init failed in webhookProcessor:', e.message);
  }
}

// Process a Stripe event object (the parsed event from stripe.webhooks.constructEvent)
const processStripeEvent = async (event) => {
  const type = event.type || '';

  // checkout.session.completed - mark payment paid and persist payment_intent/charge
  if (type === 'checkout.session.completed') {
    const session = event.data?.object || {};
    const metadata = session.metadata || {};
    const paymentId = metadata.paymentId;
    if (!paymentId) return { ok: false, reason: 'no paymentId in session metadata' };

    const payment = await Payment.findById(paymentId);
    if (!payment) return { ok: false, reason: 'payment not found' };

    // persist payment intent
    const paymentIntentId = session.payment_intent || session.paymentIntent || null;
    if (paymentIntentId) {
      payment.providerData = { ...(payment.providerData || {}), paymentIntentId };
      // try to fetch the payment intent to get charge id
      if (stripe && stripe.paymentIntents && typeof stripe.paymentIntents.retrieve === 'function') {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          const chargeId = pi?.charges?.data?.[0]?.id || null;
          if (chargeId) payment.providerData = { ...(payment.providerData || {}), chargeId };
        } catch (e) {
          console.warn('stripe.paymentIntents.retrieve failed:', e.message);
        }
      }
    }

    if (payment.status !== 'paid') payment.status = 'paid';
    await payment.save();
    try { await createNotification({ recipient: payment.user, type: 'payment_received', title: 'Payment received', message: `Payment of ${payment.amount} ${payment.currency} completed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){}
    return { ok: true };
  }

  // refund/charge.refunded handling
  if (type.toLowerCase().includes('refund') || type === 'charge.refunded') {
    const obj = event.data?.object || {};
    const refund = obj; // could be refund or charge
    const charge = obj.charge || obj;
    const paymentIntentId = refund.payment_intent || charge.payment_intent || charge.id || refund.charge || null;

    const queryCandidates = [];
    if (paymentIntentId) {
      queryCandidates.push({ 'providerData.paymentIntentId': paymentIntentId });
      queryCandidates.push({ 'providerData.paymentIntent': paymentIntentId });
    }
    if (charge && charge.id) {
      queryCandidates.push({ paymentReference: charge.id });
      queryCandidates.push({ 'providerData.chargeId': charge.id });
    }

    let payment = null;
    for (const q of queryCandidates) {
      payment = await Payment.findOne(q);
      if (payment) break;
    }
    if (!payment) {
      payment = await Payment.findOne({ 'providerData.stripePaymentIntentId': paymentIntentId }) || await Payment.findOne({ 'providerData.stripeChargeId': charge && charge.id });
    }

    if (!payment) return { ok: false, reason: 'no matching payment' };

    payment.status = 'refunded';
    payment.escrowStatus = 'refunded';
    payment.refundDetails = { provider: 'stripe', refundId: refund.id || null, raw: refund };
    payment.refundedAt = new Date();
    await payment.save();
    try { await createNotification({ recipient: payment.user, type: 'payment_refunded', title: 'Payment refunded', message: `A refund of ${payment.amount} ${payment.currency} was processed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){}
    return { ok: true };
  }

  return { ok: false, reason: 'unhandled stripe event type' };
};

// Process a Razorpay payload (parsed JSON)
const processRazorpayPayload = async (payload) => {
  const event = payload.event || payload.event_type || '';
  const refundEntity = payload.payload?.refund?.entity || payload.payload?.refund_entity || null;
  const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_entity || null;

  const reconcile = async (refundObj, paymentObj) => {
    const razorpayPaymentId = (refundObj && (refundObj.payment_id || refundObj.paymentId)) || (paymentObj && (paymentObj.id || paymentObj.payment_id)) || null;
    if (!razorpayPaymentId) return { ok: false, reason: 'no razorpay id' };

    const payment = await Payment.findOne({ $or: [ { 'providerData.razorpayPaymentId': razorpayPaymentId }, { paymentReference: razorpayPaymentId }, { 'providerData.payment_id': razorpayPaymentId } ] });
    if (!payment) return { ok: false, reason: 'no matching payment' };

    if (refundObj) {
      payment.status = 'refunded';
      payment.escrowStatus = 'refunded';
      payment.refundDetails = { provider: 'razorpay', refundId: refundObj.id || refundObj.refund_id || null, raw: refundObj };
      payment.refundedAt = new Date();
      await payment.save();
      try { await createNotification({ recipient: payment.user, type: 'payment_refunded', title: 'Payment refunded', message: `A refund of ${payment.amount} ${payment.currency} was processed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){}
      return { ok: true };
    }

    if (paymentObj) {
      if (payment.status !== 'paid') {
        payment.status = 'paid';
        await payment.save();
        try { await createNotification({ recipient: payment.user, type: 'payment_received', title: 'Payment received', message: `Payment of ${payment.amount} ${payment.currency} completed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){}
      }
      return { ok: true };
    }

    return { ok: false, reason: 'no refund/payment obj' };
  };

  if (event && event.toLowerCase().includes('refund')) {
    return await reconcile(refundEntity, null);
  }
  if (event && event.toLowerCase().includes('payment')) {
    return await reconcile(null, paymentEntity);
  }

  return { ok: false, reason: 'unhandled razorpay event type' };
};

module.exports = {
  processStripeEvent,
  processRazorpayPayload,
};
