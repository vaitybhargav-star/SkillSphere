// Backfill script: compute and store skill embeddings for all FreelancerProfile documents
// Usage: node scripts/backfillFreelancerEmbeddings.js

const mongoose = require('mongoose');
const FreelancerProfile = require('../models/FreelancerProfile');
const { getEmbedding, initializePipeline } = require('../utils/huggingfaceMatching');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SkillSphere');
  console.log('Connected to DB');

  try {
    await initializePipeline();
  } catch (e) {
    console.error('Failed to initialize HF pipeline:', e.message);
    process.exit(1);
  }

  const profiles = await FreelancerProfile.find();
  console.log(`Found ${profiles.length} freelancer profiles`);

  for (const profile of profiles) {
    try {
      const skills = (profile.skills || []).map(s => (typeof s === 'string' ? s : s.name || '')) .filter(Boolean);
      if (skills.length === 0) continue;

      const embeddings = [];
      for (const skill of skills) {
        const emb = await getEmbedding(String(skill));
        if (emb && emb.length) embeddings.push({ skill, embedding: emb });
      }

      if (embeddings.length > 0) {
        // Use updateOne to avoid triggering schema validations that may fail due to malformed
        // geoLocation fields in some documents. This writes the embeddings directly.
        await FreelancerProfile.updateOne({ _id: profile._id }, { $set: { skillEmbeddings: embeddings } });
        console.log(`Saved embeddings for profile ${profile._id} (${embeddings.length} skills)`);
      }
    } catch (err) {
      console.warn('Failed to process profile', profile._id, err.message);
    }
  }

  console.log('Backfill complete');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });