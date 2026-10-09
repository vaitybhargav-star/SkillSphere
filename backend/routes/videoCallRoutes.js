const express = require("express");
const router = express.Router();
const videoCallManager = require("../utils/videoCallManager");
const { protect } = require("../middleware/authMiddleware");

/**
 * GET /api/video-calls/active
 * Get active calls for current user
 */
router.get("/active", protect, (req, res) => {
  try {
    const calls = videoCallManager.getActiveCalls(req.user._id.toString());
    res.status(200).json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/video-calls/history
 * Get call history for current user
 */
router.get("/history", protect, (req, res) => {
  try {
    const calls = videoCallManager.getCallHistory(req.user._id.toString());
    res.status(200).json({ success: true, calls });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/video-calls/:callId
 * Get details of a specific call
 */
router.get("/:callId", protect, (req, res) => {
  try {
    const call = videoCallManager.getCall(req.params.callId);
    if (!call) {
      return res.status(404).json({ success: false, message: "Call not found" });
    }

    // Check authorization
    const userId = req.user._id.toString();
    if (call.initiator !== userId && call.participant !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized access to call" });
    }

    res.status(200).json({ success: true, call });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/video-calls/stats
 * Get video call statistics
 */
router.get("/stats/summary", protect, (req, res) => {
  try {
    const userId = req.user._id.toString();
    const history = videoCallManager.getCallHistory(userId);
    
    const stats = {
      totalCalls: history.length,
      totalDuration: history.reduce((sum, call) => sum + (call.duration || 0), 0),
      averageDuration: history.length > 0 ? Math.round(history.reduce((sum, call) => sum + (call.duration || 0), 0) / history.length) : 0,
      missedCalls: history.filter((call) => call.status === "rejected").length,
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
