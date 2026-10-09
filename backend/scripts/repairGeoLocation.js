// Repair script: ensure FreelancerProfile.geoLocation has a coordinates array (empty if unknown)
// Usage: node scripts/repairGeoLocation.js

const mongoose = require('mongoose');
const FreelancerProfile = require('../models/FreelancerProfile');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SkillSphere');
  console.log('Connected to DB');

  const query = {
    $or: [
      { geoLocation: { $exists: false } },
      { 'geoLocation.coordinates': { $exists: false } },
      { 'geoLocation.coordinates': { $not: { $type: 'array' } } },
      { 'geoLocation.coordinates': { $size: 0 } },
      { 'geoLocation.coordinates': { $not: { $size: 2 } } },
    ],
  };

  const profiles = await FreelancerProfile.find(query);
  console.log(`Found ${profiles.length} profiles with missing/invalid geoLocation.coordinates`);

  let fixed = 0;
  for (const p of profiles) {
    try {
      if (!p.geoLocation || typeof p.geoLocation !== 'object') p.geoLocation = { type: 'Point', coordinates: [] };
      else {
        // ensure type is Point
        if (!p.geoLocation.type) p.geoLocation.type = 'Point';
        // ensure coordinates is an array of numbers or empty
        if (!Array.isArray(p.geoLocation.coordinates)) p.geoLocation.coordinates = [];
        else if (p.geoLocation.coordinates.length !== 2) p.geoLocation.coordinates = [];
      }

      try {
        // Use raw collection update to avoid Mongoose casting/indexing issues
        // If coordinates are missing or invalid, remove the geoLocation field so it doesn't violate the 2dsphere index
        await FreelancerProfile.collection.updateOne({ _id: p._id }, { $unset: { geoLocation: "" } });
        fixed++;
        console.log(`Removed invalid geoLocation for profile ${p._id}`);
      } catch (uerr) {
        console.warn(`Update failed for ${p._id}:`, uerr.message);
      }
    } catch (err) {
      console.warn(`Failed to fix profile ${p._id}:`, err.message);
    }
  }

  console.log(`Repair complete. Fixed ${fixed} profiles.`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });