const User = require("../models/User");
const ClientProfile = require("../models/ClientProfile");
const FreelancerProfile = require("../models/FreelancerProfile");
const { initializePipeline, getEmbedding } = require("../utils/huggingfaceMatching");

// GET user profile based on role
const getProfileByRole = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id));
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpire -verificationToken -twoFactorSecret -twoFactorTempSecret");
 
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let profile;

    if (user.role === "client") {
      profile = await ClientProfile.findOne({ userId: userId });
      if (!profile) {
        // Create default client profile if doesn't exist
        profile = await ClientProfile.create({ userId: userId });
      }
    } else if (user.role === "freelancer") {
      profile = await FreelancerProfile.findOne({ user: userId });
      if (!profile) {
        // Create default freelancer profile if doesn't exist
        profile = await FreelancerProfile.create({ user: userId });
      }
    } else if (user.role === "admin") {
      return res.status(200).json({
        success: true,
        role: "admin",
        user: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    }

    return res.status(200).json({
      success: true,
      role: user.role,
      user,
      profile,
    });
  } catch (error) {
    console.error('Profile load error:', error);
    res.status(500).json({ success: false, message: 'Failed to load profile' });
  }
};

// normalize helper for incoming profile fields
const normalizeArrayField = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    // try to parse JSON array: '[]' or '"[\"a\",\"b\"]"'
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      // not JSON, continue
    }
    // fallback: comma separated
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const buildSkillEmbeddings = async (skills) => {
  if (!Array.isArray(skills) || skills.length === 0) return [];

  const normalizedSkills = skills
    .map((skill) => {
      if (!skill) return null;
      if (typeof skill === 'object' && skill.name) return skill.name;
      if (typeof skill === 'object' && skill.skill) return skill.skill;
      if (typeof skill === 'string') return skill;
      return null;
    })
    .filter(Boolean);

  if (normalizedSkills.length === 0) return [];

  try {
    await initializePipeline();
    const embeddings = [];
    for (const skill of normalizedSkills) {
      const embedding = await getEmbedding(String(skill));
      if (Array.isArray(embedding) && embedding.length > 0) {
        embeddings.push({ skill, embedding });
      }
    }
    return embeddings;
  } catch (err) {
    console.warn('Failed to compute freelancer skill embeddings:', err.message);
    return [];
  }
};

// UPDATE client profile
const updateClientProfile = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id));
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId);

        if (user.role !== "client") {
      return res.status(403).json({ success: false, message: "Not authorized as client" });
    }

    // sanitize incoming payload: convert known array fields to arrays
    const payload = { ...req.body };
    if (payload.portfolioLinks !== undefined) payload.portfolioLinks = normalizeArrayField(payload.portfolioLinks);

    // ensure we set the 'user' ref expected by schema
    let profile = await ClientProfile.findOne({ userId: userId });

    if (!profile) {
      profile = await ClientProfile.create({ userId: userId, ...payload });
    } else {
      Object.assign(profile, payload);
      await profile.save();
    }

    // If a profileImage is provided, also update the User document's profileImage
    if (payload.profileImage) {
      user.profileImage = payload.profileImage;
      await user.save();
    }

    // If phone is included in payload, update it on the User document (phone is stored on User)
    if (payload.phone !== undefined) {
      user.phone = payload.phone;
      await user.save();
    }

    res.status(200).json({ success: true, profile, user });
  } catch (error) {
    console.error('Client profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update client profile' });
  }
};

// UPDATE freelancer profile
const updateFreelancerProfile = async (req, res) => {
  try {
    const userId = (req.user && (req.user._id || req.user.id));
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const user = await User.findById(userId);

    if (user.role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Not authorized as freelancer" });
    }

    // sanitize incoming payload similarly to client
    const payload = { ...req.body };

    // Normalize skills: accept comma-separated string, JSON array, or array of strings/objects
    if (payload.skills !== undefined) {
      const rawSkills = normalizeArrayField(payload.skills);
      // Map to array of { name, level? }
      payload.skills = rawSkills.map((s) => {
        if (!s) return null;
        if (typeof s === 'string') return { name: s };
        if (typeof s === 'object' && s.name) return s;
        return { name: String(s) };
      }).filter(Boolean);
    }

    // Normalize portfolio: accept array of urls or objects
    if (payload.portfolio !== undefined) {
      if (typeof payload.portfolio === 'string') {
        const arr = normalizeArrayField(payload.portfolio);
        payload.portfolio = arr.map((url) => ({ projectLink: url }));
      } else if (Array.isArray(payload.portfolio)) {
        payload.portfolio = payload.portfolio.map((p) => {
          if (typeof p === 'string') return { projectLink: p };
          return p;
        });
      } else {
        payload.portfolio = [];
      }
    }

    let profile = await FreelancerProfile.findOne({ user: userId });

    if (!profile) {
      profile = await FreelancerProfile.create({ user: userId, ...payload });
    } else {
      Object.assign(profile, payload);
      await profile.save();
    }

    if (payload.skills !== undefined) {
      const embeddings = await buildSkillEmbeddings(profile.skills || []);
      if (embeddings.length > 0) {
        profile.skillEmbeddings = embeddings;
        await profile.save();
      } else if (profile.skills && profile.skills.length === 0) {
        profile.skillEmbeddings = [];
        await profile.save();
      }
    }

    // Update User.profileImage when provided
    if (payload.profileImage) {
      user.profileImage = payload.profileImage;
      await user.save();
    }

    // If phone is included in payload, update it on the User document as well
    if (payload.phone !== undefined) {
      user.phone = payload.phone;
      await user.save();
    }

    res.status(200).json({ success: true, profile, user });
  } catch (error) {
    console.error('Freelancer profile update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update freelancer profile' });
  }
};

module.exports = {
  getProfileByRole,
  updateClientProfile,
  updateFreelancerProfile,
};
