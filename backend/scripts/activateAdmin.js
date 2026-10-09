require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function main(){
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const u = await User.findOne({ email: 'admin@skillsphere.com' });
  if (!u) { console.error('Admin not found'); process.exit(1); }
  u.status = 'active';
  u.isVerified = true;
  await u.save();
  console.log('Admin activated');
  await mongoose.disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
