const crypto = require("crypto");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const speakeasy = require("speakeasy");
const { OAuth2Client } = require("google-auth-library");
const { findOrCreateGoogleUser } = require("../utils/googleAuth");

const register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    const normalizedRole = (role || "client").toLowerCase();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!fullName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    if (!["client", "freelancer"].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Role is invalid. Please choose Client or Freelancer.",
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      fullName,
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      isVerified: false,
    });

    // generate email verification token for non-admin users
    if (!newUser.isVerified) {
      const verifyToken = crypto.randomBytes(20).toString("hex");
      newUser.verificationToken = verifyToken;
      await newUser.save();

      const sendEmail = require("../utils/sendEmail");
      const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/verify?token=${verifyToken}`;
      const html = `<p>Hi ${newUser.fullName},</p><p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>. After verification you'll be redirected to the app.</p>`;

      let previewUrl;
      try {
        const emailResult = await sendEmail({ to: newUser.email, subject: "Verify your SkillSphere account", html });
        previewUrl = emailResult?.previewUrl;
      } catch (e) {
        console.warn("Verification email failed:", e.message);
      }

      return res.status(201).json({
        success: true,
        message: "Registration successful. Please verify your email before logging in.",
        verificationRequired: true,
        verificationPreviewUrl: previewUrl,
        user: {
          _id: newUser._id,
          fullName: newUser.fullName,
          email: newUser.email,
          role: newUser.role,
          profileImage: newUser.profileImage,
          isVerified: newUser.isVerified,
        },
      });
    }

    const token = generateToken(newUser._id, newUser.role);

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      token,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        profileImage: newUser.profileImage,
        isVerified: newUser.isVerified,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended.",
      });
    }

    if (!user.password) {
      return res.status(403).json({
        success: false,
        message: "This account was created through Google login. Please sign in with Google or reset your password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password.",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        verificationRequired: true,
        email: user.email,
        message: "Email address not verified. Please verify your account before logging in.",
      });
    }

    user.lastLogin = new Date();
    user.lastSeen = new Date();
    await user.save();

    // If user has 2FA enabled, don't issue final JWT yet. Return a short-lived 2FA token instead.
    if (user.twoFactorEnabled) {
      const twoFactorToken = jwt.sign({ id: user._id, purpose: "2fa" }, process.env.JWT_SECRET, { expiresIn: "5m" });
      return res.status(200).json({ success: true, twoFactorRequired: true, twoFactorToken });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const googleTokenLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({ success: false, message: "Google OAuth is not configured." });
    }

    const { idToken, role } = req.body;

    if (!idToken) {
      return res.status(400).json({ success: false, message: "idToken is required." });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ success: false, message: "Invalid Google token payload." });
    }

    const user = await findOrCreateGoogleUser(
      {
        email: payload.email,
        displayName: payload.name || payload.email,
        googleId: payload.sub,
      },
      role
    );

    if (user.twoFactorEnabled) {
      const twoFactorToken = jwt.sign({ id: user._id, purpose: "2fa" }, process.env.JWT_SECRET, { expiresIn: "5m" });
      return res.status(200).json({ success: true, twoFactorRequired: true, twoFactorToken, user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, isVerified: user.isVerified } });
    }

    const token = generateToken(user._id, user.role);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Google token login error:", error);
    return res.status(401).json({ success: false, message: "Unable to authenticate with Google." });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Profile Error:", error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with that email.",
      });
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();
    const sendEmail = require("../utils/sendEmail");
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/reset?token=${resetToken}`;
    const html = `<p>Hi ${user.fullName},</p><p>Use this link to reset your password: <a href="${resetUrl}">Reset password</a></p><p>Or use this token: <strong>${resetToken}</strong></p>`;

    try {
      await sendEmail({ to: user.email, subject: "SkillSphere Password Reset", html });
    } catch (e) {
      console.warn("Password reset email failed:", e.message);
    }

    res.status(200).json({
      success: true,
      message: "Reset token generated and emailed if SMTP is configured.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified." });
    }

    const verifyToken = crypto.randomBytes(20).toString("hex");
    user.verificationToken = verifyToken;
    await user.save();

    const sendEmail = require("../utils/sendEmail");
    const verifyUrl = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/verify?token=${verifyToken}`;
    const html = `<p>Hi ${user.fullName},</p><p>Please verify your email by clicking <a href="${verifyUrl}">this link</a>.</p><p>If the button does not work, paste this URL in your browser:</p><p>${verifyUrl}</p>`;

    let previewUrl;
    try {
      const emailResult = await sendEmail({ to: user.email, subject: "SkillSphere Email Verification", html });
      previewUrl = emailResult?.previewUrl;
    } catch (e) {
      console.warn("Resend verification email failed:", e.message);
    }

    return res.status(200).json({
      success: true,
      message: "Verification email resent. Please check your inbox.",
      verificationPreviewUrl: previewUrl,
    });
  } catch (error) {
    console.error("Resend Verification Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: "Reset token and password are required.",
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Two-Factor related endpoints
const twoFactorSetup = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const secret = speakeasy.generateSecret({ name: `SkillSphere (${user.email})` });
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    return res.status(200).json({ success: true, otpauth_url: secret.otpauth_url, base32: secret.base32 });
  } catch (err) {
    console.error('2FA setup error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const twoFactorEnable = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.twoFactorTempSecret) return res.status(400).json({ success: false, message: 'No 2FA setup in progress' });

    const verified = speakeasy.totp.verify({ secret: user.twoFactorTempSecret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid code' });

    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    await user.save();

    return res.status(200).json({ success: true, message: 'Two-factor authentication enabled' });
  } catch (err) {
    console.error('2FA enable error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

const twoFactorDisable = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.twoFactorSecret) return res.status(400).json({ success: false, message: '2FA is not enabled' });

    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid code' });

    user.twoFactorSecret = undefined;
    user.twoFactorEnabled = false;
    await user.save();

    return res.status(200).json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (err) {
    console.error('2FA disable error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Verify 2FA login using a short-lived twoFactorToken
const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { twoFactorToken, code } = req.body;
    if (!twoFactorToken || !code) return res.status(400).json({ success: false, message: 'Token and code are required' });

    let payload;
    try {
      payload = jwt.verify(twoFactorToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired twoFactorToken' });
    }

    if (!payload || payload.purpose !== '2fa' || !payload.id) return res.status(400).json({ success: false, message: 'Invalid token payload' });

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.twoFactorSecret) return res.status(400).json({ success: false, message: '2FA not configured for user' });

    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token: code, window: 1 });
    if (!verified) return res.status(400).json({ success: false, message: 'Invalid code' });

    const token = generateToken(user._id, user.role);
    return res.status(200).json({ success: true, token, user: { _id: user._id, fullName: user.fullName, email: user.email, role: user.role, profileImage: user.profileImage } });
  } catch (err) {
    console.error('verifyTwoFactorLogin error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
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
};