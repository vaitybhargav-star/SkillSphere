const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { verifyState } = require("../utils/googleState");
const { findOrCreateGoogleUser } = require("../utils/googleAuth");

const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET
);

function setupPassport() {
  if (!isGoogleConfigured) {
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] && profile.emails[0].value;
          if (!email) return done(new Error("No email from Google"), null);

          let desiredRole = "client";
          try {
            const payload = verifyState(req.query.state);
            if (payload && payload.role) {
              desiredRole = payload.role;
            }
          } catch (ignored) {
            desiredRole = "client";
          }

          const user = await findOrCreateGoogleUser(
            {
              email,
              displayName: profile.displayName,
              googleId: profile.id,
            },
            desiredRole
          );

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );

  return true;
}

module.exports = {
  setupPassport,
  isGoogleConfigured: () => isGoogleConfigured,
};
