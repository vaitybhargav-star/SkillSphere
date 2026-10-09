const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { sendMessage, getMessages, markRead, getContacts, searchUsers } = require("../controllers/messageController");

router.post("/", protect, sendMessage);
router.get("/search", protect, searchUsers);
router.get("/contacts", protect, getContacts);
router.get("/:userId", protect, getMessages);
// Mark all messages from :userId to the current user as read
router.post("/mark-read/:userId", protect, markRead);

module.exports = router;
