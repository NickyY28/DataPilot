const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const llmService = require('./services/llmService');

console.log('🔍 Testing Gemini API Connection...');
console.log('🔑 Checking API Key presence...');

if (!process.env.GEMINI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY is missing from .env file');
    process.exit(1);
} else {
    console.log('✅ API Key found (starts with: ' + process.env.GEMINI_API_KEY.substring(0, 4) + '...)');
}

console.log('📡 Attempting to connect to Google Gemini...');

// Call the verifyConnection method you added
llmService.verifyConnection().then(() => {
    // wait a bit for the internal async logs to finish if necessary
    setTimeout(() => {
        console.log('\n--- Diagnosis complete ---');
    }, 2000);
});
