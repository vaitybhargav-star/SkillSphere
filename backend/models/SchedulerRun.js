const mongoose = require('mongoose');

const schedulerRunSchema = new mongoose.Schema({
  taskType: { type: String, required: true }, // e.g., 'embeddings' | 'trending'
  status: { type: String, enum: ['running','success','failed'], default: 'running' },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  durationMs: { type: Number },
  error: { type: String },
  meta: { type: mongoose.Schema.Types.Mixed },
  logs: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('SchedulerRun', schedulerRunSchema);
