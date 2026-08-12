'use strict';
const express = require('express');
const router = express.Router();

const {
  getAnomalyResults,
  getLLMComparison,
} = require('../controllers/anomalyController');

// GET /api/anomaly/results
// Returns the anomaly_summary from the latest ML engine pipeline report.
router.get('/results', getAnomalyResults);

// POST /api/anomaly/llm-comparison
// Body: { anomaly_summary: { ... } }
// Returns LLM interpretation of the measured anomaly results.
router.post('/llm-comparison', getLLMComparison);

module.exports = router;
