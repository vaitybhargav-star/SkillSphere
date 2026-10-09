const User = require('../models/User');
const { normalizeRole } = require('./googleState');

const makeDisplayName = (displayName, email) => {
  if (displayName && typeof displayName === 'string' && displayName.trim().length) {
    return displayName.trim();
  }
  if (email && typeof email === 'string') {
    return email.split('@')[0];
  }
  return 'Google User';
};

const findOrCreateGoogleUser = async ({ email, displayName, googleId }, role = 'client') => {
  if (!email || !googleId) {
    throw new Error('Google user profile must include an email and googleId');
  }

  const normalizedRole = normalizeRole(role);
  const lookup = {
    $or: [{ googleId }, { email }],
  };

  let user = await User.findOne(lookup);

  if (!user) {
    user = await User.create({
      fullName: makeDisplayName(displayName, email),
      email,
      googleId,
      isVerified: true,
      role: normalizedRole,
    });
    return user;
  }

  let changed = false;

  if (!user.googleId) {
    user.googleId = googleId;
    changed = true;
  }

  if (!user.isVerified) {
    user.isVerified = true;
    changed = true;
  }

  if (!user.fullName || user.fullName.trim() === '') {
    user.fullName = makeDisplayName(displayName, email);
    changed = true;
  }

  if (changed) {
    await user.save();
  }

  return user;
};

module.exports = {
  findOrCreateGoogleUser,
};