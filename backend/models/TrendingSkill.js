const mongoose = require('mongoose');

const trendingSkillSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true, unique: true },
    score: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    // optional metadata
    lastComputedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrendingSkill', trendingSkillSchema);
