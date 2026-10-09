const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  clearAllNotifications,
} = require("../controllers/notificationController");

router.post("/", protect, createNotification);
router.get("/", protect, getNotifications);
router.get("/unread", protect, getUnreadCount);
router.put("/mark-all-read", protect, markAllAsRead);
router.put("/:id/read", protect, markAsRead);
router.delete("/", protect, clearAllNotifications);
router.delete("/:id", protect, deleteNotification);

module.exports = router;
