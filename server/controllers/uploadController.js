const asyncHandler = require('express-async-handler');
const Dataset = require('../models/Dataset');

const uploadDataset = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const dataset = await Dataset.create({
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    status: 'uploaded',
  });

  res.status(201).json({
    success: true,
    message: 'Dataset uploaded successfully',
    dataset,
  });
});

const getDatasets = asyncHandler(async (req, res) => {
  const datasets = await Dataset.find({}).sort({ uploadedAt: -1 });
  res.json({ success: true, count: datasets.length, datasets });
});

module.exports = { uploadDataset, getDatasets };
