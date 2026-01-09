const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const upload = require('../middleware/upload');

router.post('/upload', upload.single('file'), dataController.uploadCSV);

router.post('/process', dataController.processCommand);

router.post('/insights', dataController.getInsights);

router.post('/ask', dataController.askQuestion);

router.get('/download/:dataId', dataController.downloadData);

module.exports = router;