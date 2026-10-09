const express = require("express");
const router = express.Router();
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  requestPayout,
  getPendingPayouts,
  getPayoutHistory,
  getAvailableBalance,
  updateBankAccount,
  getAllPayouts,
  updatePayoutStatus,
} = require("../controllers/payoutController");

// Freelancer routes
router.post("/request", protect, authorizeRoles("freelancer"), requestPayout);
router.get("/pending", protect, authorizeRoles("freelancer"), getPendingPayouts);
router.get("/history", protect, authorizeRoles("freelancer"), getPayoutHistory);
router.get("/balance", protect, authorizeRoles("freelancer"), getAvailableBalance);
router.put("/bank-account", protect, authorizeRoles("freelancer"), updateBankAccount);

// Admin routes
router.get("/", protect, authorizeRoles("admin"), getAllPayouts);
router.put("/:payoutId/status", protect, authorizeRoles("admin"), updatePayoutStatus);

module.exports = router;
