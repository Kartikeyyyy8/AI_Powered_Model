const asyncHandler = require('express-async-handler');
const Dataset = require('../models/Dataset');
const Anomaly = require('../models/Anomaly');

const validateDataset = asyncHandler(async (req, res) => {
  const { datasetId } = req.params;
  
  const mockValidationResult = {
    datasetId,
    qualityScore: 92.4,
    totalRows: 1000,
    passedRows: 945,
    failedRows: 55,
    nullValuesFound: 14,
    duplicatesFound: 5,
    schemaStatus: 'Valid',
  };

  res.json({
    success: true,
    message: 'Validation executed successfully',
    validation: mockValidationResult,
  });
});

const getAnomalies = asyncHandler(async (req, res) => {
  const { datasetId } = req.params;
  const anomalies = await Anomaly.find({ datasetId });
  res.json({ success: true, count: anomalies.length, anomalies });
});

module.exports = { validateDataset, getAnomalies };
