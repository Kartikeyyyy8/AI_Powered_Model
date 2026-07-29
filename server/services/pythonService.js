const { spawn } = require('child_process');
const path = require('path');

const runPythonScript = (scriptPath, args = []) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('python', [scriptPath, ...args]);
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}: ${errorOutput}`));
      }
      try {
        const parsed = JSON.parse(output);
        resolve(parsed);
      } catch (err) {
        resolve({ rawOutput: output });
      }
    });
  });
};

module.exports = { runPythonScript };
