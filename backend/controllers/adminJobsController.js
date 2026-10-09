const TrendingSkill = require('../models/TrendingSkill');
const SchedulerRun = require('../models/SchedulerRun');
const scheduler = require('../jobs/scheduler');

// GET /api/admin/trending-skills
const getTrendingSkills = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const skills = await TrendingSkill.find().sort({ score: -1 }).limit(limit);
    res.status(200).json({ success: true, skills });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/jobs/runs
const getSchedulerRuns = async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const runs = await SchedulerRun.find().sort({ startedAt: -1 }).limit(limit).lean();
    res.status(200).json({ success: true, runs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/run-embeddings
const runEmbeddingsNow = async (req, res) => {
  try {
    // Trigger the embeddings task asynchronously
    if (!scheduler || typeof scheduler.refreshEmbeddingsTask !== 'function') {
      return res.status(500).json({ success: false, message: 'Scheduler task not available' });
    }

    // run but don't block long-polling; return accepted
    scheduler.refreshEmbeddingsTask().catch(err => console.error('[Scheduler] manual embeddings task error:', err.message));
    res.status(202).json({ success: true, message: 'Embeddings refresh scheduled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/run-trending
const runTrendingNow = async (req, res) => {
  try {
    if (!scheduler || typeof scheduler.computeTrendingSkillsTask !== 'function') {
      return res.status(500).json({ success: false, message: 'Scheduler task not available' });
    }

    scheduler.computeTrendingSkillsTask().catch(err => console.error('[Scheduler] manual trending task error:', err.message));
    res.status(202).json({ success: true, message: 'Trending computation scheduled' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTrendingSkills, getSchedulerRuns, runEmbeddingsNow, runTrendingNow };