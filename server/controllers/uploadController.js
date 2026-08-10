const asyncHandler = require('express-async-handler');
const Dataset = require('../models/Dataset');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// In-memory fallback store when MongoDB service is offline
const memoryDatasets = [];

/**
 * Run the Python ML Engine
 */
const runMLEngine = (datasetPath) => {
  return new Promise((resolve, reject) => {
    // Project root
    const projectRoot = path.join(__dirname, '../..');

    // ML Engine directory
    const mlEngineDir = path.join(projectRoot, 'ml_engine');

    // Reports directory
    const reportsDir = path.join(mlEngineDir, 'reports');

    // Python executable
    //
    // If you are using your ML Engine virtual environment,
    // this will use:
    // ml_engine/.venv/Scripts/python.exe
    //
    // Otherwise it falls back to "python".
    const venvPython = path.join(
      mlEngineDir,
      '.venv',
      'Scripts',
      'python.exe'
    );

    const pythonCommand = fs.existsSync(venvPython)
      ? venvPython
      : 'python';

    console.log('========================================');
    console.log('Starting ML Engine');
    console.log('Dataset:', datasetPath);
    console.log('ML Engine:', mlEngineDir);
    console.log('Reports:', reportsDir);
    console.log('Python:', pythonCommand);
    console.log('========================================');

    // Make sure reports directory exists
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const pythonProcess = spawn(
      pythonCommand,
      ['main.py'],
      {
        cwd: mlEngineDir,

        env: {
          ...process.env,

          // Tell main.py which uploaded file to process
          DATA_PATH: datasetPath,

          // Tell main.py where to save reports
          REPORTS_DIR: reportsDir
        }
      }
    );

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();

      stdout += output;

      // Show Python logs in Node terminal
      console.log(`[ML ENGINE] ${output.trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();

      stderr += output;

      console.error(`[ML ENGINE ERROR] ${output.trim()}`);
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start ML Engine:', error);
      reject(error);
    });

    pythonProcess.on('close', (code) => {
      console.log(`ML Engine finished with exit code: ${code}`);

      if (code === 0) {
        resolve({
          success: true,
          stdout,
          stderr
        });
      } else {
        reject(
          new Error(
            `ML Engine failed with exit code ${code}\n${stderr || stdout}`
          )
        );
      }
    });
  });
};


/**
 * Upload Dataset
 * 
 * Upload → Save → Run ML Engine → Return results
 */
const uploadDataset = asyncHandler(async (req, res) => {

  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  // Your current ML engine uses pd.read_csv(),
  // so for now we require CSV files.
  const extension = path
    .extname(req.file.originalname)
    .toLowerCase();

  if (extension !== '.csv') {
    res.status(400);
    throw new Error(
      'Only CSV files are currently supported by the ML Engine.'
    );
  }

  const datasetData = {
    _id: `DS-${Date.now()}`,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    status: 'processing',
    uploadedAt: new Date().toISOString()
  };

  try {

    // ------------------------------------------------
    // 1. Save dataset metadata
    // ------------------------------------------------

    try {
      const dataset = await Dataset.create(datasetData);

      memoryDatasets.unshift(dataset);
    } catch (err) {
      console.warn(
        'MongoDB offline, using in-memory dataset store fallback:',
        err.message
      );

      memoryDatasets.unshift(datasetData);
    }


    // ------------------------------------------------
    // 2. Run ML Engine on uploaded file
    // ------------------------------------------------

    console.log('');
    console.log('========================================');
    console.log('DATASET UPLOADED');
    console.log(`File: ${req.file.originalname}`);
    console.log('Starting AI Data Quality Engine...');
    console.log('========================================');
    console.log('');

    const mlResult = await runMLEngine(req.file.path);


    // ------------------------------------------------
    // 3. Update status
    // ------------------------------------------------

    datasetData.status = 'completed';


    // ------------------------------------------------
    // 4. Return response
    // ------------------------------------------------

    return res.status(201).json({
      success: true,

      message: 'Dataset uploaded and ML analysis completed successfully.',

      dataset: datasetData,

      mlEngine: {
        status: 'completed',
        message: 'AI Data Quality Engine completed successfully.'
      },

      output: mlResult.stdout
    });

  } catch (err) {

    console.error('ML Engine failed:', err);

    datasetData.status = 'failed';

    return res.status(500).json({
      success: false,

      message: 'Dataset uploaded, but ML Engine processing failed.',

      dataset: datasetData,

      error: err.message
    });
  }
});


/**
 * Get uploaded datasets
 */
const getDatasets = asyncHandler(async (req, res) => {

  try {

    const dbDatasets = await Dataset
      .find({})
      .sort({ uploadedAt: -1 });

    if (dbDatasets && dbDatasets.length > 0) {

      return res.json({
        success: true,
        count: dbDatasets.length,
        datasets: dbDatasets
      });

    }

  } catch (err) {

    console.warn(
      'MongoDB offline, returning in-memory datasets fallback'
    );

  }

  res.json({
    success: true,
    count: memoryDatasets.length,
    datasets: memoryDatasets
  });
});


module.exports = {
  uploadDataset,
  getDatasets
};