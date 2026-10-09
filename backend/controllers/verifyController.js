const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Missing token");

    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).send("Invalid or expired token");

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    const jwt = generateToken(user._id, user.role);
    const redirectUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/auth/verified?token=${jwt}`;
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Verify Error:", err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { verifyEmail };
