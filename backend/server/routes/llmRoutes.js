const express = require('express');
const router = express.Router();
const llmController = require('../controllers/llmController');

router.post('/ask', llmController.askQuestion);
router.post('/analyze-intent', llmController.analyzeIntent);
router.post('/chat', llmController.chat);

module.exports = router;