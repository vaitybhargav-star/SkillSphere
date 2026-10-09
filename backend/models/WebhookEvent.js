const mongoose = require('mongoose');

const WebhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true }, // 'stripe' | 'razorpay' | 'unknown'
  eventId: { type: String, required: true },
  raw: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending','processing','done','failed'], default: 'pending' },
  retryCount: { type: Number, default: 0 },
  nextAttemptAt: { type: Date },
  lastError: { type: String },
  processedAt: { type: Date },
  success: { type: Boolean, default: false },
}, { timestamps: true });

// compound unique index so provider+eventId is unique (avoids collisions across providers)
WebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('WebhookEvent', WebhookEventSchema);
