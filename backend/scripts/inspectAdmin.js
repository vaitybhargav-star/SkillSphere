require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');

async function main(){
  await mongoose.connect(process.env.MONGO_URI);
  const User = require('../models/User');
  const u = await User.findOne({ email: 'admin@skillsphere.com' }).lean();
  console.log(JSON.stringify(u, null, 2));
  await mongoose.disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
