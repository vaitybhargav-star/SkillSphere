require('dotenv').config();
const mongoose = require('mongoose');
const Gig = require('../models/Gig');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/SkillSphere';

async function run() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB');

  const clientId = '6a54bdabdc6d5ab9977abf7a'; // existing client

  const gig = await Gig.create({
    title: 'Test Pending Gig (admin approval)',
    description: 'This gig was created by an admin test script for approval flow.',
    category: 'Testing',
    budget: 250,
    budgetType: 'fixed',
    client: clientId,
    approvalStatus: 'pending',
    skills: ['testing', 'admin'],
    geoLocation: { type: 'Point', coordinates: [0, 0] },
    milestones: [ { title: 'Initial', description: 'First milestone', amount: 125, paymentAmount: 125 } ]
  });

  console.log('Created gig:', gig._id.toString());
  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
