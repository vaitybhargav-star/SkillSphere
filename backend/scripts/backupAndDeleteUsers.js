const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const fs = require('fs');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/SkillSphere';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);

    const users = await User.find().lean();
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupPath = path.join(backupDir, `users-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(users, null, 2));
    console.log('Wrote backup to', backupPath, '- records:', users.length);

    const res = await User.deleteMany({});
    console.log('Deleted users count:', res.deletedCount);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(2);
  }
})();
