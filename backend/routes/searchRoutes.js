const express = require("express");
const router = express.Router();
const { searchGigs, searchFreelancers, getFilterOptions } = require("../controllers/searchController");
const { protect } = require("../middleware/authMiddleware");

/**
 * Advanced Search Routes
 */

// Search gigs with filters (public - no auth required)
router.get("/gigs", searchGigs);

// Search freelancers with filters (public)
router.get("/freelancers", searchFreelancers);

// Get available filter options
router.get("/filters", getFilterOptions);

module.exports = router;
