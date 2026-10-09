const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/SkillSphere';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const count = await User.countDocuments();
    console.log('User count:', count);

    const list = await User.find().select('email isDeleted status createdAt googleId').limit(50).lean();
    console.log('Sample users (up to 50):');
    list.forEach((u, i) => console.log(i + 1 + '. ', u));

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error listing users:', err.message || err);
    process.exit(2);
  }
})();
