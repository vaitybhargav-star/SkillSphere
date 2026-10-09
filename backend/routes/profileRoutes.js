const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  getProfileByRole,
  updateClientProfile,
  updateFreelancerProfile,
} = require("../controllers/profileController");

// Get profile based on user role
router.get("/", protect, getProfileByRole);

// Update client profile (clients only)
router.put("/client", protect, authorizeRoles("client"), updateClientProfile);

// Update freelancer profile (freelancers only)
router.put("/freelancer", protect, authorizeRoles("freelancer"), updateFreelancerProfile);

module.exports = router;
