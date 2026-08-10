const express = require('express');
const router = express.Router();

const {
  generateReport,
  getReports
} = require('../controllers/reportController');

router.post('/generate', generateReport);

router.get('/', getReports);

module.exports = router;