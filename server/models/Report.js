const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
  reportType: { type: String, enum: ['PDF', 'PPT', 'EXCEL'], required: true },
  filePath: { type: String, required: true },
  summary: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', reportSchema);
