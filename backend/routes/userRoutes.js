const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  getMyProfile,
  updateProfile,
} = require("../controllers/userController");


// Get Logged-in User Profile
router.get("/profile", protect, getMyProfile);

// Update Logged-in User Profile
router.put("/profile", protect, updateProfile);

module.exports = router;