const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const { uploadDataset, getDatasets } = require('../controllers/uploadController');

router.post('/', upload.single('dataset'), uploadDataset);
router.get('/', getDatasets);

module.exports = router;
