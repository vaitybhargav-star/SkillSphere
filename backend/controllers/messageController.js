const mongoose = require("mongoose");
const Message = require("../models/Message");
const User = require("../models/User");

const sendMessage = async (req, res) => {
  try {
    const attachments = Array.isArray(req.body.attachments)
      ? req.body.attachments.map((attachment) => ({
          filename: attachment.filename,
          url: attachment.url,
          contentType: attachment.contentType,
          size: attachment.size,
        }))
      : req.body.attachment
      ? [{
          filename: req.body.attachment.filename,
          url: req.body.attachment.url,
          contentType: req.body.attachment.contentType,
          size: req.body.attachment.size,
        }]
      : [];

    const message = await Message.create({
      sender: req.user._id,
      receiver: req.body.receiver,
      text: req.body.text || "",
      attachments,
    });
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    }).sort({ createdAt: 1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markRead = async (req, res) => {
  try {
    const result = await Message.updateMany(
      { sender: req.params.userId, receiver: req.user._id, read: false },
      { $set: { read: true } }
    );
    // result.modifiedCount in modern mongoose
    res.status(200).json({ success: true, modifiedCount: result.modifiedCount || 0 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getContacts = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { receiver: currentUserId }],
        },
      },
      {
        $project: {
          peer: {
            $cond: [{ $eq: ["$sender", currentUserId] }, "$receiver", "$sender"],
          },
        },
      },
      { $group: { _id: "$peer" } },
    ]);

    const contactIds = contacts.map((contact) => contact._id);
    const users = await User.find({ _id: { $in: contactIds } })
      .select("_id fullName email role")
      .lean();

    res.status(200).json({ success: true, contacts: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || !String(q).trim()) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const safeQuery = String(q).trim();
    const regex = new RegExp(safeQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    const searchConditions = [
      { fullName: regex },
      { email: regex },
    ];

    if (mongoose.Types.ObjectId.isValid(safeQuery)) {
      searchConditions.unshift({ _id: mongoose.Types.ObjectId(safeQuery) });
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: searchConditions,
    })
      .select("_id fullName email role")
      .limit(30)
      .lean();

    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { sendMessage, getMessages, markRead, getContacts, searchUsers };
