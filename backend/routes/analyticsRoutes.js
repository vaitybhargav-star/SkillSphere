const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

/**
 * Analytics Dashboard Routes
 */

// Get freelancer overview
router.get("/freelancer/:freelancerId/overview", analyticsController.getFreelancerOverview);

// Get earnings analytics
router.get("/freelancer/:freelancerId/earnings", analyticsController.getEarningsAnalytics);

// Get proposal analytics
router.get("/freelancer/:freelancerId/proposals", analyticsController.getProposalAnalytics);

// Get review analytics
router.get("/freelancer/:freelancerId/reviews", analyticsController.getReviewAnalytics);

// Get project analytics
router.get("/freelancer/:freelancerId/projects", analyticsController.getProjectAnalytics);

// Get full dashboard
router.get("/freelancer/:freelancerId/full-dashboard", analyticsController.getFullDashboard);

module.exports = router;
