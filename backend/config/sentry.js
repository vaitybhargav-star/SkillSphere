const Sentry = require('@sentry/node');
let sentryInstance = null;

function initSentry() {
  if (sentryInstance) return sentryInstance;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.log('[Sentry] SENTRY_DSN not configured — skipping Sentry initialization');
    return null;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.0),
    autoSessionTracking: true,
  });

  console.log('[Sentry] Initialized');
  sentryInstance = Sentry;
  return sentryInstance;
}

module.exports = { initSentry };