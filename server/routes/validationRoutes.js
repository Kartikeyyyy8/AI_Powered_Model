const express = require('express');
const router = express.Router();
const { validateDataset, getAnomalies } = require('../controllers/validationController');

router.post('/:datasetId/run', validateDataset);
router.get('/:datasetId/anomalies', getAnomalies);

module.exports = router;
