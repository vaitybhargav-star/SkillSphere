require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/SkillSphere';

async function run() {
  await mongoose.connect(MONGO);
  console.log('Connected to MongoDB');

  const email = 'admin@skillsphere.com';
  const newPassword = 'admin@12345';

  const admin = await User.findOne({ email });
  if (!admin) {
    console.error('Admin user not found:', email);
    await mongoose.disconnect();
    process.exit(1);
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();
  console.log('Admin password updated for', email);

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
