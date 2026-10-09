const User = require("../models/User");

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const {
      fullName,
      bio,
      location,
      skills,
      hourlyRate,
      experience,
      availability,
      portfolio,
      phone,
    } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.fullName = fullName || user.fullName;
    user.bio = bio || user.bio;
    user.phone = phone || user.phone;
    user.location = location || user.location;
    user.skills = skills || user.skills;
    user.hourlyRate = hourlyRate ?? user.hourlyRate;
    user.experience = experience ?? user.experience;
    user.availability = availability ?? user.availability;
    user.portfolio = portfolio || user.portfolio;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile Updated Successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
};