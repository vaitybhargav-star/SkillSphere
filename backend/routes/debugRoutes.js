const express = require("express");
const router = express.Router();
const sendEmail = require("../utils/sendEmail");

router.get("/emails", (req, res) => {
  res.json({
    success: true,
    emails: sendEmail.getPreviewEmails(),
  });
});

// Debug: return masked environment variable status (non-production only)
router.get('/env', (req, res) => {
  try {
    const mask = (value) => {
      if (!value) return null;
      const s = String(value);
      if (s.length <= 8) return s.replace(/./g, '*');
      return `${s.slice(0, 4)}...${s.slice(-4)} (len:${s.length})`;
    };

    res.json({
      success: true,
      env: {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? mask(process.env.GOOGLE_CLIENT_ID) : null,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? mask(process.env.GOOGLE_CLIENT_SECRET) : null,
        BACKEND_URL: process.env.BACKEND_URL || null,
        FRONTEND_URL: process.env.FRONTEND_URL || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to read env', error: err.message });
  }
});

module.exports = router;
