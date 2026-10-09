const mongoose = require('mongoose');
require('dotenv').config();
(async function(){
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/SkillSphere');
    const Payment = require('../models/Payment');
    const p = await Payment.create({ user: new mongoose.Types.ObjectId(), gig: new mongoose.Types.ObjectId(), amount: 9.99, currency: 'USD', provider: 'stripe', status: 'pending' });
    console.log('Created payment id:', p._id.toString());
    process.exit(0);
  } catch (err) {
    console.error('Error creating payment:', err);
    process.exit(1);
  }
})();