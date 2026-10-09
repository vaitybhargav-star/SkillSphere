const express = require("express");
const router = express.Router();
const { protect: authMiddleware } = require("../middleware/authMiddleware");
const { createReview, getReviews } = require("../controllers/reviewController");
const {
  createReview: createEnhancedReview,
  getUserReviews,
  reportReview,
  markReviewHelpful,
  getReputationAnalytics,
  getDetailedAnalytics,
  getReputationBadge,
} = require("../controllers/enhancedReviewController");

// Original routes (kept for backwards compatibility)
router.post("/", authMiddleware, createReview);
router.get("/:userId", getReviews);

// Enhanced review routes (new)
router.post("/enhanced/create", authMiddleware, createEnhancedReview);
router.get("/enhanced/:userId", getUserReviews);
router.post("/:reviewId/report", authMiddleware, reportReview);
router.put("/:reviewId/helpful", authMiddleware, markReviewHelpful);

// Analytics & reputation routes
router.get("/analytics/reputation/:userId", getReputationAnalytics);
router.get("/analytics/detailed/:userId", getDetailedAnalytics);
router.get("/reputation/badge/:userId", getReputationBadge);

module.exports = router;
