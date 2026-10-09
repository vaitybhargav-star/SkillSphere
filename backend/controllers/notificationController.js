const Notification = require("../models/Notification");
const User = require("../models/User");
const nodemailer = require("nodemailer");

const emailConfig = {
  service: process.env.SMTP_SERVICE || "gmail",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
};

const transporter = nodemailer.createTransport(emailConfig);

const humanizeType = (type) => {
  const map = {
    new_gig_posted: "New gig posted",
    proposal_accepted: "Proposal accepted",
    payment_received: "Payment received",
    review_added: "Review added",
  };

  return map[type] || type || "New notification";
};

const normalizeNotificationPayload = (data = {}) => {
  const recipient = data.recipient || data.user || data.to;
  const user = data.user || recipient;
  const type = data.type || "general";
  const title = data.title || humanizeType(type);
  const message = data.message || data.body || `${title}`;

  return {
    ...data,
    user,
    recipient,
    type,
    title,
    message,
    read: false,
    sendEmail: Boolean(data.sendEmail),
    metadata: data.metadata || {},
  };
};

const emitNotification = (recipientId, notification) => {
  if (!global.io || !recipientId) return;

  const payload = notification.toObject ? notification.toObject() : notification;
  const rooms = [`user:${recipientId}`, `user_${recipientId}`];
  rooms.forEach((room) => global.io.to(room).emit("notification", payload));
};

const createNotification = async (data) => {
  try {
    const payload = normalizeNotificationPayload(data);
    if (!payload.recipient) {
      return null;
    }

    const notification = await Notification.create(payload);

    if (payload.sendEmail) {
      await sendEmailNotification(notification.toObject());
    }

    emitNotification(payload.recipient, notification);
    return notification;
  } catch (error) {
    console.error("Notification creation error:", error);
    return null;
  }
};

const sendEmailNotification = async (data) => {
  try {
    if (!emailConfig.auth.user) {
      console.warn("Email notifications disabled - SMTP not configured");
      return;
    }

    const recipientId = data.recipient || data.user;
    if (!recipientId) return;

    const user = await User.findById(recipientId);
    if (!user?.email) return;

    const emailTemplates = {
      new_gig_posted: {
        subject: "New gig posted",
        html: `<h2>New gig posted</h2><p>${data.message}</p>`,
      },
      proposal_accepted: {
        subject: "Your proposal was accepted",
        html: `<h2>Proposal accepted</h2><p>${data.message}</p>`,
      },
      payment_received: {
        subject: "Payment received",
        html: `<h2>Payment received</h2><p>${data.message}</p>`,
      },
      review_added: {
        subject: "You have a new review",
        html: `<h2>New review</h2><p>${data.message}</p>`,
      },
    };

    const template = emailTemplates[data.type] || emailTemplates.new_gig_posted;

    await transporter.sendMail({
      from: emailConfig.auth.user,
      to: user.email,
      subject: template.subject,
      html: template.html,
    });
  } catch (error) {
    console.warn("Email sending failed (not critical):", error.message);
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { read, type, limit = 20, skip = 0 } = req.query;

    const filter = { $or: [{ user: userId }, { recipient: userId }] };

    if (read !== undefined) {
      filter.read = read === "true";
    }

    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Notification.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        total,
        unread: await Notification.countDocuments({
          $or: [{ user: userId }, { recipient: userId }],
          read: false,
        }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, $or: [{ user: userId }, { recipient: userId }] },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { $or: [{ user: userId }, { recipient: userId }], read: false },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      $or: [{ user: userId }, { recipient: userId }],
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      $or: [{ user: userId }, { recipient: userId }],
      read: false,
    });

    res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({
      $or: [{ user: userId }, { recipient: userId }],
    });

    res.status(200).json({
      success: true,
      message: "All notifications cleared",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  clearAllNotifications,
  sendEmailNotification,
};
