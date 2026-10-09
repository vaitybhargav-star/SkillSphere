const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const passport = require("passport");
const { setupPassport } = require("./config/passport");
const { initSentry } = require("./config/sentry");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const profileRoutes = require("./routes/profileRoutes");
const freelancerRoutes = require("./routes/freelancerRoutes");
const gigRoutes = require("./routes/gigRoutes");
const proposalRoutes = require("./routes/proposalRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const messageRoutes = require("./routes/messageRoutes");
const disputeRoutes = require("./routes/disputeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const payoutRoutes = require("./routes/payoutRoutes");
const configRoutes = require("./routes/configRoutes");
const matchingRoutes = require("./routes/matchingRoutes");
const availabilityRoutes = require("./routes/availabilityRoutes");
const progressRoutes = require("./routes/progressRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const searchRoutes = require("./routes/searchRoutes");
const videoCallRoutes = require("./routes/videoCallRoutes");

const { handleStripeWebhook } = require("./controllers/webhookController");

const createApp = () => {
  const app = express();
  const path = require('path');

  const Sentry = initSentry();
  if (Sentry) {
    app.use(Sentry.Handlers.requestHandler());
  }

  app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  }));
  // Use helmet core and configure CSP and CORP explicitly
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http://localhost:5000", "http://localhost:5173"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    }
  }));
  app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // IMPORTANT: Serve static files BEFORE rate limiting and body parsing
  const uploadsPublic = path.join(__dirname, 'public');
  app.use('/uploads', express.static(path.join(uploadsPublic, 'uploads'), {
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Access-Control-Allow-Origin', '*');
      // Ensure cross-origin resource policy is permissive for static uploads
      try { res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); } catch (e) { /* ignore */ }
    }
  }));

  setupPassport();
  app.use(passport.initialize());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
  });
  app.use(limiter);
  // webhook raw body route must be before json parser
  app.post("/api/payments/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (req, res) => res.send("🚀 Welcome to SkillSphere Backend API"));

  app.use("/api/auth", authRoutes);
  app.use("/api/user", userRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/freelancer", freelancerRoutes);
  app.use("/api/gigs", gigRoutes);
  app.use("/api/proposals", proposalRoutes);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/messages", messageRoutes);
  app.use("/api/disputes", disputeRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/payouts", payoutRoutes);
  app.use("/api/matching", matchingRoutes);
  app.use("/api/config", configRoutes);
  app.use("/api/availability", availabilityRoutes);
  app.use("/api/progress", progressRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/search", searchRoutes);
  app.use("/api/video-calls", videoCallRoutes);
 
  // API route for uploads
  const uploadsRoutes = require('./routes/uploadsRoutes');
  app.use('/api/uploads', uploadsRoutes);

  if (process.env.NODE_ENV !== "production") {
    const debugRoutes = require("./routes/debugRoutes");
    app.use("/api/debug", debugRoutes);
  }

  app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route Not Found" });
  });

  if (Sentry) {
    app.use(Sentry.Handlers.errorHandler());
  }

  return app;
};

module.exports = createApp;
