const crypto = require('crypto');

const DEFAULT_HMAC_SECRET = 'skill-sphere-google-state-secret';
const VALID_ROLES = new Set(['client', 'freelancer']);

const getStateSecret = () => {
  return process.env.GOOGLE_STATE_SECRET || process.env.JWT_SECRET || DEFAULT_HMAC_SECRET;
};

const signState = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Google state payload must be an object');
  }

  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getStateSecret())
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
};

const verifyState = (token) => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getStateSecret())
    .update(encoded)
    .digest('base64url');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    if (!payload || typeof payload !== 'object') return null;
    return payload;
  } catch (err) {
    return null;
  }
};

const normalizeRole = (role) => {
  if (!role || typeof role !== 'string') return 'client';
  const normalized = role.toLowerCase().trim();
  return VALID_ROLES.has(normalized) ? normalized : 'client';
};

const normalizeRedirect = (redirect, frontendUrl) => {
  const defaultUrl = new URL(frontendUrl || 'http://localhost:5173');

  if (!redirect || typeof redirect !== 'string') {
    return defaultUrl.toString();
  }

  try {
    const resolved = new URL(redirect, defaultUrl);
    if (resolved.origin !== defaultUrl.origin) {
      return defaultUrl.toString();
    }
    return resolved.toString();
  } catch (err) {
    return defaultUrl.toString();
  }
};

module.exports = {
  signState,
  verifyState,
  normalizeRole,
  normalizeRedirect,
};