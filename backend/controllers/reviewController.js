const Review = require("../models/Review");
const User = require("../models/User");
const { createNotification } = require("./notificationController");

const createReview = async (req, res) => {
  try {
    const review = await Review.create({
      ...req.body,
      reviewer: req.user._id,
    });

    await User.findByIdAndUpdate(req.body.reviewee, { $set: { profileCompleted: Math.min(100, 80 + Number(req.body.rating)) } });

    await createNotification({
      recipient: req.body.reviewee,
      type: "review_added",
      title: "Review added",
      message: `You received a new review from ${req.user.fullName || "a user"}.`,
      sendEmail: true,
      metadata: { reviewId: review._id.toString(), gigId: req.body.gig },
    });

    res.status(201).json({ success: true, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId }).populate("reviewer", "fullName");
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createReview, getReviews };
