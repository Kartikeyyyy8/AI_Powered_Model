const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  rowCount: { type: Number, default: 0 },
  columnCount: { type: Number, default: 0 },
  qualityScore: { type: Number, default: 0 },
  status: { type: String, enum: ['uploaded', 'processing', 'validated', 'failed'], default: 'uploaded' },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Dataset', datasetSchema);
