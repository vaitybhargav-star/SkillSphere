const express = require("express");
const router = express.Router();

const {
  register,
  login,
  getMyProfile,
  forgotPassword,
  resetPassword,
  resendVerificationEmail,
  twoFactorSetup,
  twoFactorEnable,
  twoFactorDisable,
  verifyTwoFactorLogin,
  googleTokenLogin,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const passport = require("passport");
const { isGoogleConfigured } = require("../config/passport");
const { signState, verifyState, normalizeRole, normalizeRedirect } = require("../utils/googleState");

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DEFAULT_GOOGLE_REDIRECT = new URL('/auth/success', FRONTEND_URL).toString();

const googleAuthMiddleware = (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.redirect(`${FRONTEND_URL}/login?error=google-not-configured`);
  }

  const requestedRole = req.query.role ? normalizeRole(req.query.role) : "client";
  const redirect = normalizeRedirect(req.query.redirect || DEFAULT_GOOGLE_REDIRECT, FRONTEND_URL);
  const state = signState({ role: requestedRole, redirect });

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state,
  })(req, res, next);
};

const googleCallbackMiddleware = (req, res, next) => {
  if (!isGoogleConfigured()) {
    return res.redirect(`${FRONTEND_URL}/login?error=google-not-configured`);
  }
  return passport.authenticate("google", {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login`,
  })(req, res, next);
};

// Google OAuth
router.get("/google", googleAuthMiddleware);

router.get("/google/callback", googleCallbackMiddleware, (req, res) => {
  try {
    if (!req.user) {
      console.error("Google callback: No user found");
      return res.redirect(`${FRONTEND_URL}/login?error=auth-failed`);
    }

    const generateToken = require("../utils/generateToken");
    const token = generateToken(req.user._id, req.user.role);

    const statePayload = req.query.state ? verifyState(req.query.state) : null;
    const redirect = normalizeRedirect(statePayload?.redirect || DEFAULT_GOOGLE_REDIRECT, FRONTEND_URL);

    const url = new URL(redirect);
    url.searchParams.set("token", token);
    return res.redirect(url.toString());
  } catch (err) {
    console.error("Google callback error:", err);
    return res.redirect(`${FRONTEND_URL}/login?error=auth-error`);
  }
});

router.post("/google/token", googleTokenLogin);
router.post("/register", register);
router.post("/login", login);
// 2FA login verification (exchanges twoFactorToken + code for final JWT)
router.post("/2fa/verify-login", verifyTwoFactorLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/resend-verification", resendVerificationEmail);
router.get("/me", protect, getMyProfile);

// Two-factor setup endpoints
router.get('/2fa/setup', protect, twoFactorSetup);
router.post('/2fa/enable', protect, twoFactorEnable);
router.post('/2fa/disable', protect, twoFactorDisable);

const { verifyEmail } = require("../controllers/verifyController");
router.get("/verify", verifyEmail);

module.exports = router;