const getConfig = (req, res) => {
  res.json({
    success: true,
    config: {
      googleConfigured: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      stripeConfigured: Boolean(process.env.STRIPE_SECRET),
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      backendUrl: process.env.BACKEND_URL || "http://localhost:5000",
      frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
    },
  });
};

module.exports = { getConfig };
