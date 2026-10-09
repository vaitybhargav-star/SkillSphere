const { signState, verifyState, normalizeRole, normalizeRedirect } = require('../utils/googleState');

describe('Google state helpers', () => {
  test('signState and verifyState round trip with role and redirect', () => {
    const payload = { role: 'freelancer', redirect: '/auth/success' };
    const state = signState(payload);

    expect(state).toBeTruthy();
    const decoded = verifyState(state);
    expect(decoded).toMatchObject(payload);
  });

  test('normalizeRole returns client on invalid input', () => {
    expect(normalizeRole('ADMIN')).toBe('client');
    expect(normalizeRole('')).toBe('client');
    expect(normalizeRole(null)).toBe('client');
  });

  test('normalizeRedirect only allows frontend origin', () => {
    const frontendUrl = 'http://localhost:5173';
    expect(normalizeRedirect('/auth/success', frontendUrl)).toBe('http://localhost:5173/auth/success');
    expect(normalizeRedirect('http://localhost:5173/auth/success?foo=1', frontendUrl)).toBe('http://localhost:5173/auth/success?foo=1');
    expect(normalizeRedirect('https://malicious.site', frontendUrl)).toBe(`${frontendUrl}/`);
    expect(normalizeRedirect('', frontendUrl)).toBe(`${frontendUrl}/`);
  });
});