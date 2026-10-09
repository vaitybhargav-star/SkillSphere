const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createDispute,
  getDisputes,
  getDisputeDetails,
  addEvidence,
  submitResponse,
  resolveDispute,
  getDisputeStats,
} = require("../controllers/disputeController");

router.post("/", protect, createDispute);
router.get("/", protect, getDisputes);
router.get("/stats", protect, getDisputeStats);
router.get("/:id", protect, getDisputeDetails);
router.post("/:id/evidence", protect, addEvidence);
router.post("/:id/respond", protect, submitResponse);
router.post("/:id/resolve", protect, resolveDispute);

module.exports = router;
