const mongoose = require('mongoose');

const anomalySchema = new mongoose.Schema({
  datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
  rowIndex: { type: Number, required: true },
  featureName: { type: String, required: true },
  value: { type: mongoose.Schema.Types.Mixed },
  anomalyType: { type: String, enum: ['ZScore', 'IQR', 'IsolationForest', 'LOF', 'DBSCAN', 'BusinessRule'] },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  aiExplanation: { type: String },
  detectedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Anomaly', anomalySchema);
