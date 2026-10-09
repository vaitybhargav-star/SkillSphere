const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const matchingController = require("../controllers/matchingController");

const router = express.Router();

/**
 * AI-Powered Job Matching Routes
 */

// Get recommended freelancers for a gig
router.get("/recommend/:gigId", protect, authorizeRoles("client", "admin"), matchingController.getRecommendedFreelancers);

// Get recommended gigs for a freelancer
router.get("/find-gigs/:freelancerId", protect, authorizeRoles("freelancer", "admin"), matchingController.getRecommendedGigs);

// Get trending skills across platform
router.get("/trending/skills", protect, matchingController.getTrendingSkills);

module.exports = router;
