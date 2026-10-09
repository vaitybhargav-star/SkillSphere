/*
 Background worker to retry failed webhook events stored in WebhookEvent collection.
 Usage: node jobs/webhookRetryWorker.js
*/

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const WebhookEvent = require('../models/WebhookEvent');
const { processStripeEvent, processRazorpayPayload } = require('../controllers/webhookProcessor');

const DEFAULT_INTERVAL = Number(process.env.WEBHOOK_RETRY_INTERVAL || 60); // seconds
const MAX_RETRIES = Number(process.env.WEBHOOK_MAX_RETRIES || 5);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const claimOneEvent = async () => {
  const now = new Date();
  // Find an event that is pending or failed and nextAttemptAt <= now (or not set)
  const filter = {
    success: false,
    status: { $in: ['pending','failed'] },
    $or: [ { nextAttemptAt: { $lte: now } }, { nextAttemptAt: { $exists: false } } ]
  };

  const update = {
    $set: { status: 'processing', processedAt: null },
    $inc: { retryCount: 1 }
  };

  const ev = await WebhookEvent.findOneAndUpdate(filter, update, { sort: { createdAt: 1 }, new: true });
  return ev;
};

const computeBackoffMs = (retryCount) => {
  // exponential backoff in seconds, capped at 1 hour
  const seconds = Math.min(3600, Math.pow(2, retryCount) * 60);
  return seconds * 1000;
};

const processEvent = async (ev) => {
  if (!ev) return;
  const provider = ev.provider;
  const raw = ev.raw || {};

  try {
    let result = { ok: false, reason: 'unhandled' };
    if (provider === 'stripe') {
      result = await processStripeEvent(raw);
    } else if (provider === 'razorpay') {
      result = await processRazorpayPayload(raw);
    } else {
      // try to auto-detect based on payload shape
      if (raw && raw.type) result = await processStripeEvent(raw);
      else if (raw && raw.event) result = await processRazorpayPayload(raw);
    }

    if (result && result.ok) {
      ev.success = true;
      ev.status = 'done';
      ev.lastError = null;
      ev.processedAt = new Date();
      await ev.save();
      console.log('WebhookEvent processed successfully:', ev.provider, ev.eventId);
      return true;
    }

    // non-ok: schedule retry
    const retryCount = ev.retryCount || 1;
    if (retryCount >= MAX_RETRIES) {
      ev.status = 'failed';
      ev.lastError = result && result.reason ? String(result.reason) : 'max retries exceeded';
      ev.nextAttemptAt = null;
      ev.processedAt = new Date();
      await ev.save();
      console.warn('WebhookEvent marked failed after max retries:', ev.provider, ev.eventId, ev.lastError);
      return false;
    }

    // schedule next attempt
    const backoffMs = computeBackoffMs(retryCount);
    ev.nextAttemptAt = new Date(Date.now() + backoffMs);
    ev.status = 'failed';
    ev.lastError = result && result.reason ? String(result.reason) : 'transient error';
    await ev.save();
    console.log(`WebhookEvent scheduled for retry at ${ev.nextAttemptAt.toISOString()} (retry ${retryCount})`, ev.provider, ev.eventId);
    return false;
  } catch (err) {
    // unexpected exception while processing
    const retryCount = ev.retryCount || 1;
    if (retryCount >= MAX_RETRIES) {
      ev.status = 'failed';
      ev.lastError = err.message;
      ev.nextAttemptAt = null;
      ev.processedAt = new Date();
      await ev.save();
      console.error('WebhookEvent processing exception - marked failed:', err.message);
      return false;
    }

    const backoffMs = computeBackoffMs(retryCount);
    ev.status = 'failed';
    ev.lastError = err.message;
    ev.nextAttemptAt = new Date(Date.now() + backoffMs);
    await ev.save();
    console.warn('WebhookEvent processing exception - scheduled retry:', err.message);
    return false;
  }
};

const runLoop = async () => {
  console.log('Starting webhook retry worker...');
  await connectDB();

  while (true) {
    try {
      const ev = await claimOneEvent();
      if (!ev) {
        // nothing to process
        await sleep(DEFAULT_INTERVAL * 1000);
        continue;
      }

      console.log('Claimed webhook event for processing:', ev.provider, ev.eventId, 'retryCount=', ev.retryCount);
      await processEvent(ev);

      // small pause between events to avoid fast tight loops
      await sleep(500);
    } catch (loopErr) {
      console.error('Worker loop error:', loopErr.message);
      await sleep(5000);
    }
  }
};

if (require.main === module) {
  runLoop().catch((e) => {
    console.error('Worker failed to start:', e.message);
    process.exit(1);
  });
}

module.exports = { runLoop };
