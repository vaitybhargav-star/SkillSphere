const express = require("express");
const router = express.Router();

const {
  protect,
  authorizeRoles,
} = require("../middleware/authMiddleware");

const {
  createFreelancerProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  deleteFreelancerProfile,
} = require("../controllers/freelancerController");

// ========================================
// Freelancer Profile Routes
// ========================================

// Create Profile
router.post(
  "/profile",
  protect,
  authorizeRoles("freelancer"),
  createFreelancerProfile
);

// Get Profile
router.get(
  "/profile",
  protect,
  authorizeRoles("freelancer"),
  getFreelancerProfile
);

// Update Profile
router.put(
  "/profile",
  protect,
  authorizeRoles("freelancer"),
  updateFreelancerProfile
);

// Delete Profile
router.delete(
  "/profile",
  protect,
  authorizeRoles("freelancer"),
  deleteFreelancerProfile
);

module.exports = router;