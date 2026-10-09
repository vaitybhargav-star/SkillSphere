const Payment = require("../models/Payment");
const WebhookEvent = require("../models/WebhookEvent");
const { createNotification } = require("./notificationController");
const crypto = require("crypto");
let stripe = null;
if (process.env.STRIPE_SECRET) {
  try {
    stripe = require("stripe")(process.env.STRIPE_SECRET);
  } catch (e) {
    stripe = null;
    console.warn("Stripe initialization failed:", e.message);
  }
}

/**
 * Unified webhook handler for payments. App routes POST /api/payments/webhook here with raw body.
 * It supports Stripe (uses stripe-signature header) and Razorpay (x-razorpay-signature header).
 */
const handleStripeWebhook = async (req, res) => {
  try {
    // Raw body (Buffer) is expected
    const rawBody = req.body;

    // Detect Razorpay webhooks first
    const razorSig = req.headers["x-razorpay-signature"];
    if (razorSig && process.env.RAZORPAY_WEBHOOK_SECRET) {
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      const bodyString = rawBody.toString();
      const expected = crypto.createHmac("sha256", secret).update(bodyString).digest("hex");
      if (expected !== razorSig) {
        console.error("Razorpay webhook signature mismatch");
        return res.status(400).send("Invalid signature");
      }

      let payload;
      try {
        payload = JSON.parse(bodyString);
      } catch (e) {
        console.error("Invalid JSON from Razorpay webhook", e.message);
        return res.status(400).send("Invalid payload");
      }

      // Idempotency: try to reserve this event so only one process handles it
      const razorEventId = payload?.id || payload?.payload?.refund?.entity?.id || payload?.payload?.payment?.entity?.id || null;
      if (razorEventId) {
        try {
          await WebhookEvent.create({ provider: 'razorpay', eventId: razorEventId, raw: payload, success: false });
        } catch (e) {
          // Duplicate key -> already reserved/processed
          if (e.code === 11000) {
            console.log('Duplicate Razorpay webhook received (reserved):', razorEventId);
            return res.json({ received: true, duplicate: true });
          }
          console.warn('Failed to reserve Razorpay webhook event:', e.message);
        }
      }

      // Basic handling for refund/payment events
      const event = payload.event || payload.event_type || "";
      const refundEntity = payload.payload?.refund?.entity || payload.payload?.refund_entity || null;
      const paymentEntity = payload.payload?.payment?.entity || payload.payload?.payment_entity || null;

      // Helper to update Payment record
      const reconcileRazorpay = async (paymentId, refundObj, paymentObj) => {
        try {
          // Find a Payment by providerData.razorpayPaymentId or paymentReference
          const razorpayPaymentId = (refundObj && (refundObj.payment_id || refundObj.paymentId)) || (paymentObj && (paymentObj.id || paymentObj.payment_id)) || null;
          if (!razorpayPaymentId) return;

          const payment = await Payment.findOne({ $or: [ { 'providerData.razorpayPaymentId': razorpayPaymentId }, { paymentReference: razorpayPaymentId }, { 'providerData.payment_id': razorpayPaymentId } ] });
          if (!payment) {
            console.warn("No payment found matching Razorpay id", razorpayPaymentId);
            return;
          }

          if (refundObj) {
            payment.status = "refunded";
            payment.escrowStatus = "refunded";
            payment.refundDetails = { provider: "razorpay", refundId: refundObj.id || refundObj.refund_id || null, raw: refundObj };
            payment.refundedAt = new Date();
            await payment.save();
            // Notify user
            try { await createNotification({ recipient: payment.user, type: 'payment_refunded', title: 'Payment refunded', message: `A refund of ${payment.amount} ${payment.currency} was processed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){console.warn('Notif error', e.message)}
          } else if (paymentObj) {
            // Payment captured/paid
            if (payment.status !== 'paid') {
              payment.status = 'paid';
              await payment.save();
              try { await createNotification({ recipient: payment.user, type: 'payment_received', title: 'Payment received', message: `Payment of ${payment.amount} ${payment.currency} completed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){/*ignore*/}
            }
          }
        } catch (err) {
          console.error('Error reconciling Razorpay payment:', err.message);
        }
      };

      // Act based on event
      let success = true;
      try {
        if (event && event.toLowerCase().includes('refund')) {
          await reconcileRazorpay(null, refundEntity, null);
        } else if (event && event.toLowerCase().includes('payment')) {
          await reconcileRazorpay(null, null, paymentEntity);
        }
      } catch (e) {
        success = false;
        console.error('Error processing Razorpay webhook:', e.message);
      }

      // Update reserved webhook event record with result
      try {
        if (razorEventId) {
          await WebhookEvent.findOneAndUpdate({ provider: 'razorpay', eventId: razorEventId }, { $set: { success, raw: payload, processedAt: new Date() } }, { new: true });
        }
      } catch (weErr) {
        console.warn('Failed to update Razorpay webhook event record:', weErr.message);
      }

      return res.json({ received: true });
    }

    // Otherwise treat as Stripe webhook
    const stripeSig = req.headers['stripe-signature'];
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !stripeSig || !stripeWebhookSecret) {
      console.error('Stripe not configured or signature missing');
      return res.status(400).send('Webhook not configured');
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, stripeSig, stripeWebhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency: try to reserve Stripe event so only one process handles it
    const stripeEventId = event?.id || event?.data?.object?.id || null;
    if (stripeEventId) {
      try {
        await WebhookEvent.create({ provider: 'stripe', eventId: stripeEventId, raw: event, success: false });
      } catch (e) {
        if (e.code === 11000) {
          console.log('Duplicate Stripe webhook received (reserved):', stripeEventId);
          return res.json({ received: true, duplicate: true });
        }
        console.warn('Failed to reserve Stripe webhook event:', e.message);
      }
    }

    // Handle relevant Stripe events
    try {
      // Refund-related events often contain refund or charge objects
      const type = event.type || '';

      if (type === 'checkout.session.completed') {
        const session = event.data.object || {};
        const metadata = session.metadata || {};
        const paymentId = metadata.paymentId;
        if (paymentId) {
          const payment = await Payment.findById(paymentId);
          if (payment) {
            // Record payment intent & charge ids when available
            try {
              const paymentIntentId = session.payment_intent || session.paymentIntent || null;
              if (paymentIntentId) {
                payment.providerData = { ...(payment.providerData || {}), paymentIntentId };
                // Try to fetch the PaymentIntent to get charge id
                if (stripe && stripe.paymentIntents && typeof stripe.paymentIntents.retrieve === 'function') {
                  try {
                    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
                    const chargeId = pi?.charges?.data?.[0]?.id || null;
                    if (chargeId) {
                      payment.providerData = { ...(payment.providerData || {}), chargeId };
                    }
                  } catch (piErr) {
                    console.warn('Failed to fetch payment intent details:', piErr.message);
                  }
                }
              }
            } catch (metaErr) {
              console.warn('Error saving provider metadata for payment:', metaErr.message);
            }

            if (payment.status !== 'paid') {
              payment.status = 'paid';
              await payment.save();
              console.log(`Payment ${paymentId} marked as paid via webhook.`);
              try { await createNotification({ recipient: payment.user, type: 'payment_received', title: 'Payment received', message: `Payment of ${payment.amount} ${payment.currency} completed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){}
            } else {
              // even if already paid, ensure providerData persisted
              await payment.save();
            }
          }
        }
      }

      // Generic refund handling: event types that include 'refund' or 'charge.refunded'
      if (type && type.toLowerCase().includes('refund') || type === 'charge.refunded') {
        // The event.object may be a refund or a charge
        const obj = event.data.object || {};
        // refund may provide 'payment_intent' or 'charge'
        const refund = obj;
        const charge = obj.charge || obj;
        const paymentIntentId = refund.payment_intent || charge.payment_intent || charge.id || refund.charge || null;

        // Try to find Payment record by various fallback fields
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
          // As fallback, try to match using any stripe fields in providerData
          payment = await Payment.findOne({ 'providerData.stripePaymentIntentId': paymentIntentId }) || await Payment.findOne({ 'providerData.stripeChargeId': charge && charge.id });
        }

        if (payment) {
          payment.status = 'refunded';
          payment.escrowStatus = 'refunded';
          payment.refundDetails = { provider: 'stripe', refundId: refund.id || null, raw: refund };
          payment.refundedAt = new Date();
          await payment.save();
          console.log('Payment reconciled as refunded for payment id', payment._id.toString());
          try { await createNotification({ recipient: payment.user, type: 'payment_refunded', title: 'Payment refunded', message: `A refund of ${payment.amount} ${payment.currency} was processed.`, sendEmail: true, metadata: { paymentId: payment._id.toString() } }); } catch(e){}
        } else {
          console.warn('Stripe refund webhook received but no matching Payment found. Event data stored in logs.');
        }
      }

    } catch (err) {
      console.error('Error handling Stripe webhook event:', err.message);
      return res.status(500).send();
    }

    // Update reserved Stripe webhook record to mark success
    try {
      if (stripeEventId) {
        await WebhookEvent.findOneAndUpdate({ provider: 'stripe', eventId: stripeEventId }, { $set: { success: true, raw: event, processedAt: new Date() } }, { new: true });
      }
    } catch (weErr) {
      console.warn('Failed to update Stripe webhook event record:', weErr.message);
    }

    return res.json({ received: true });
  } catch (topErr) {
    console.error('Payment webhook top-level error:', topErr.message);
    return res.status(500).send();
  }
};

module.exports = { handleStripeWebhook };
