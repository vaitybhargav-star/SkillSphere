/*
  Scheduler service (simple cron-based)
  - Can run standalone: `node jobs/scheduler.js`
  - Or imported and started in-process via server.js when SCHEDULER_ENABLED=true

  Tasks:
  - refreshEmbeddingsTask: refreshes skill embeddings for freelancer profiles changed recently or missing embeddings
  - computeTrendingSkillsTask: computes trending skills from recent gigs with simple time-decay weighting
*/

require('dotenv').config();
const cron = require('node-cron');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const FreelancerProfile = require('../models/FreelancerProfile');
const Gig = require('../models/Gig');
const TrendingSkill = require('../models/TrendingSkill');
const { initializePipeline, getEmbedding } = require('../utils/huggingfaceMatching');

const LOG_PREFIX = '[Scheduler]';
const SchedulerRun = require('../models/SchedulerRun');
const SentryRaw = (() => {
  try { return require('@sentry/node'); } catch (e) { return null; }
})();
const { initSentry } = require('../config/sentry');
let Sentry = null;
if (SentryRaw && process.env.SENTRY_DSN) {
  // Initialize using shared config helper
  Sentry = initSentry();
}

function captureSentry(err, extra = {}) {
  if (!Sentry || !process.env.SENTRY_DSN) return;
  try {
    Sentry.captureException(err, { extra });
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to capture to Sentry:`, e.message);
  }
}

async function recordRunStart(taskType, meta = {}) {
  const run = await SchedulerRun.create({ taskType, status: 'running', startedAt: new Date(), meta, logs: [] });
  return run;
}

async function appendRunLog(run, message) {
  if (!run) return;
  const entry = `${new Date().toISOString()} - ${message}`;
  run.logs = [...(run.logs || []), entry];
  await run.save();
}

async function recordRunSuccess(run, info = {}) {
  try {
    run.status = 'success';
    run.finishedAt = new Date();
    run.durationMs = run.finishedAt - run.startedAt;
    run.meta = { ...run.meta, ...info };
    await run.save();
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to record run success:`, e.message);
  }
}

async function recordRunFailure(run, error) {
  try {
    run.status = 'failed';
    run.finishedAt = new Date();
    run.durationMs = run.finishedAt - run.startedAt;
    run.error = (error && error.message) ? error.message : String(error);
    await run.save();
  } catch (e) {
    console.warn(`${LOG_PREFIX} Failed to record run failure:`, e.message);
  }
}

async function refreshEmbeddingsTask(opts = {}) {
  const windowDays = Number(process.env.EMBEDDING_REFRESH_WINDOW_DAYS || 7);
  const maxProfiles = Number(process.env.EMBEDDING_REFRESH_MAX_PROFILES || 50);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  console.log(`${LOG_PREFIX} Refresh embeddings task started. WindowDays=${windowDays}`);

  const run = await recordRunStart('embeddings', { windowDays, maxProfiles });
  await appendRunLog(run, `Started embeddings refresh windowDays=${windowDays}, maxProfiles=${maxProfiles}`);

  try {
    // find profiles that need embeddings
    const candidates = await FreelancerProfile.find({
      $or: [
        { skillEmbeddings: { $exists: false } },
        { skillEmbeddings: { $size: 0 } },
        { updatedAt: { $gte: since } },
      ],
    }).limit(maxProfiles).lean();

    if (!candidates || candidates.length === 0) {
      console.log(`${LOG_PREFIX} No freelancer profiles to refresh.`);
      await appendRunLog(run, 'No freelancer profiles found to refresh.');
      await recordRunSuccess(run, { processed: 0 });
      return;
    }

    await appendRunLog(run, `Found ${candidates.length} freelancer profiles requiring refresh.`);

    // ensure HF pipeline initialized
    try {
      await initializePipeline();
    } catch (err) {
      console.error(`${LOG_PREFIX} Failed to initialize HF pipeline:`, err.message);
      await appendRunLog(run, `Failed to initialize HF pipeline: ${err.message}`);
      await recordRunFailure(run, err);
      return;
    }

    let processed = 0;
    for (const profile of candidates) {
      try {
        const skills = (profile.skills || []).map(s => (typeof s === 'string' ? s : s.name || '')).filter(Boolean);
        if (skills.length === 0) {
          await appendRunLog(run, `Skipped profile ${profile._id}: no skills found.`);
          continue;
        }
        const embeddings = [];
        for (const skill of skills) {
          const emb = await getEmbedding(String(skill));
          if (emb && emb.length) embeddings.push({ skill, embedding: emb });
        }
        if (embeddings.length > 0) {
          await FreelancerProfile.updateOne({ _id: profile._id }, { $set: { skillEmbeddings: embeddings } });
          await appendRunLog(run, `Saved embeddings for profile ${profile._id} (${embeddings.length} skills).`);
          processed++;
        } else {
          await appendRunLog(run, `Profile ${profile._id} had no embeddings generated.`);
        }
      } catch (err) {
        console.warn(`${LOG_PREFIX} Failed to refresh profile ${profile._id}:`, err.message);
        await appendRunLog(run, `Failed to refresh profile ${profile._id}: ${err.message}`);
      }
    }

    await recordRunSuccess(run, { processed });
  } catch (err) {
    console.error(`${LOG_PREFIX} Embeddings task failed:`, err.message);
    await appendRunLog(run, `Embeddings task failed: ${err.message}`);
    captureSentry(err, { task: 'embeddings' });
    await recordRunFailure(run, err);
  }
}

async function computeTrendingSkillsTask(opts = {}) {
  const days = Number(process.env.TRENDING_WINDOW_DAYS || 30);
  const topK = Number(process.env.TRENDING_TOP_K || 50);
  const decayLambda = Number(process.env.TRENDING_DECAY_LAMBDA || 0.1); // per day decay

  console.log(`${LOG_PREFIX} Computing trending skills for last ${days} days`);

  const run = await recordRunStart('trending', { days, topK, decayLambda });
  await appendRunLog(run, `Started trending computation windowDays=${days}, topK=${topK}`);

  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // fetch recent gigs with skills
    const gigs = await Gig.find({ createdAt: { $gte: since } }).select('skills createdAt').lean();
    if (!gigs || gigs.length === 0) {
      console.log(`${LOG_PREFIX} No recent gigs found in the window.`);
      await appendRunLog(run, 'No recent gigs found in the trending window.');
      await recordRunSuccess(run, { processedGigs: 0, top: 0 });
      return;
    }

    await appendRunLog(run, `Found ${gigs.length} gigs to evaluate for trending computation.`);

    // accumulate weighted scores per skill
    const map = new Map();
    for (const gig of gigs) {
      const created = new Date(gig.createdAt || Date.now());
      const daysAgo = Math.max(0, (Date.now() - created.getTime()) / (24 * 60 * 60 * 1000));
      const weight = Math.exp(-decayLambda * daysAgo);
      const skills = gig.skills || [];
      for (const skill of skills) {
        if (!skill || typeof skill !== 'string') continue;
        const key = skill.trim().toLowerCase();
        const entry = map.get(key) || { skill: skill.trim(), score: 0, count: 0 };
        entry.score += weight;
        entry.count += 1;
        map.set(key, entry);
      }
    }

    // convert to array and sort
    const arr = Array.from(map.values());
    arr.sort((a, b) => b.score - a.score);
    const top = arr.slice(0, topK);

    // upsert trending skills
    const bulkOps = top.map(t => ({
      updateOne: {
        filter: { skill: t.skill },
        update: { $set: { score: t.score, count: t.count, lastComputedAt: new Date() } },
        upsert: true,
      }
    }));

    if (bulkOps.length > 0) {
      await TrendingSkill.bulkWrite(bulkOps);
      await appendRunLog(run, `Computed and saved top ${bulkOps.length} trending skills.`);
      const topSkills = top.slice(0, 5).map(t => `${t.skill}(${t.count})`).join(', ');
      if (topSkills) {
        await appendRunLog(run, `Top skills: ${topSkills}`);
      }
    } else {
      await appendRunLog(run, 'No trending skills to save.');
    }

    await recordRunSuccess(run, { processedGigs: gigs.length, top: bulkOps.length });
  } catch (err) {
    console.error(`${LOG_PREFIX} Trending task failed:`, err.message);
    await appendRunLog(run, `Trending task failed: ${err.message}`);
    captureSentry(err, { task: 'trending' });
    await recordRunFailure(run, err);
  }
}

async function startScheduler() {
  try {
    await connectDB();
  } catch (err) {
    console.error(`${LOG_PREFIX} DB connection failed:`, err.message);
    if (Sentry && process.env.SENTRY_DSN) Sentry.captureException(err);
    process.exit(1);
  }

  console.log(`${LOG_PREFIX} Scheduler starting`);

  // schedule expressions
  const embeddingsCron = process.env.SCHEDULER_CRON_EMBEDDINGS || process.env.SCHEDULER_CRON || '0 * * * *'; // default hourly
  const trendingCron = process.env.SCHEDULER_CRON_TRENDING || process.env.SCHEDULER_CRON || '0 2 * * *'; // default daily at 02:00

  // run initial immediate execution once (safe) then rely on cron
  try {
    await refreshEmbeddingsTask();
  } catch (err) {
    console.warn(`${LOG_PREFIX} Initial embeddings task failed:`, err.message);
    captureSentry(err, { stage: 'initial' });
  }

  try {
    await computeTrendingSkillsTask();
  } catch (err) {
    console.warn(`${LOG_PREFIX} Initial trending task failed:`, err.message);
    captureSentry(err, { stage: 'initial' });
  }

  // schedule
  cron.schedule(embeddingsCron, async () => {
    console.log(`${LOG_PREFIX} Triggering scheduled embeddings task (${embeddingsCron})`);
    try {
      await refreshEmbeddingsTask();
    } catch (err) {
      console.error(`${LOG_PREFIX} Scheduled embeddings task error:`, err.message);
      captureSentry(err, { stage: 'scheduled' });
    }
  });

  cron.schedule(trendingCron, async () => {
    console.log(`${LOG_PREFIX} Triggering scheduled trending skills task (${trendingCron})`);
    try {
      await computeTrendingSkillsTask();
    } catch (err) {
      console.error(`${LOG_PREFIX} Scheduled trending task error:`, err.message);
      captureSentry(err, { stage: 'scheduled' });
    }
  });

  console.log(`${LOG_PREFIX} Scheduler running. Embeddings cron: ${embeddingsCron}, Trending cron: ${trendingCron}`);
}

// Allow import and manual start in-process
module.exports = {
  startInProcess: async () => {
    // do not exit process here; start scheduler in same process
    startScheduler().catch(err => console.error(`${LOG_PREFIX} startInProcess error:`, err.message));
  },
  // Export tasks for manual invocation from other code (admin endpoints)
  refreshEmbeddingsTask,
  computeTrendingSkillsTask,
};

// Standalone run
if (require.main === module) {
  startScheduler().catch(err => {
    console.error(`${LOG_PREFIX} Fatal error:`, err.message);
    process.exit(1);
  });
}
