const asyncHandler = require('express-async-handler');
const Dataset = require('../models/Dataset');

// In-memory fallback store when MongoDB service is offline
const memoryDatasets = [];

const uploadDataset = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const datasetData = {
    _id: `DS-${Date.now()}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    status: 'uploaded',
    uploadedAt: new Date().toISOString(),
  };

  try {
    const dataset = await Dataset.create(datasetData);
    memoryDatasets.unshift(dataset);
    return res.status(201).json({
      success: true,
      message: 'Dataset uploaded successfully',
      dataset,
    });
  } catch (err) {
    console.warn('MongoDB offline, using in-memory dataset store fallback:', err.message);
    memoryDatasets.unshift(datasetData);
    return res.status(201).json({
      success: true,
      message: 'Dataset uploaded successfully (in-memory mode)',
      dataset: datasetData,
    });
  }
});

const getDatasets = asyncHandler(async (req, res) => {
  try {
    const dbDatasets = await Dataset.find({}).sort({ uploadedAt: -1 });
    if (dbDatasets && dbDatasets.length > 0) {
      return res.json({ success: true, count: dbDatasets.length, datasets: dbDatasets });
    }
  } catch (err) {
    console.warn('MongoDB offline, returning in-memory datasets fallback');
  }

  res.json({ success: true, count: memoryDatasets.length, datasets: memoryDatasets });
});

module.exports = { uploadDataset, getDatasets };
