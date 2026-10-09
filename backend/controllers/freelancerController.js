const FreelancerProfile = require("../models/FreelancerProfile");

// ===================================================
// Create Freelancer Profile
// ===================================================

const createFreelancerProfile = async (req, res) => {
  try {
    const existingProfile = await FreelancerProfile.findOne({
      user: req.user._id,
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: "Freelancer profile already exists.",
      });
    }

    const profile = await FreelancerProfile.create({
      user: req.user._id,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: "Freelancer profile created successfully.",
      profile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ===================================================
// Get Freelancer Profile
// ===================================================

const getFreelancerProfile = async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({
      user: req.user._id,
    }).populate(
      "user",
      "fullName email role profileImage isVerified verificationBadge"
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Freelancer profile not found.",
      });
    }

    // Increase Profile Views
    profile.profileViews += 1;
    await profile.save();

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ===================================================
// Update Freelancer Profile
// ===================================================

const updateFreelancerProfile = async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Freelancer profile not found.",
      });
    }

    Object.keys(req.body).forEach((key) => {
      profile[key] = req.body[key];
    });

    await profile.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      profile,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// ===================================================
// Delete Freelancer Profile
// ===================================================

const deleteFreelancerProfile = async (req, res) => {
  try {
    const profile = await FreelancerProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Freelancer profile not found.",
      });
    }

    await profile.deleteOne();

    res.status(200).json({
      success: true,
      message: "Freelancer profile deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

module.exports = {
  createFreelancerProfile,
  getFreelancerProfile,
  updateFreelancerProfile,
  deleteFreelancerProfile,
};