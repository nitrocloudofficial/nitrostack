import dotenv from 'dotenv';
import { config } from './src/config/env.js';

dotenv.config();

console.log('=== API Key Configuration Test ===\n');

console.log('Environment Variables:');
console.log('GEMINI_API_KEYS:', process.env.GEMINI_API_KEYS ? 'SET' : 'NOT SET');
console.log('GROQ_API_KEYS:', process.env.GROQ_API_KEYS ? 'SET' : 'NOT SET');
console.log('');

console.log('Parsed Configuration:');
console.log('Gemini Keys Count:', config.gemini.apiKeys.length);
console.log('Gemini Keys:', config.gemini.apiKeys.map(k => k.substring(0, 20) + '...'));
console.log('Gemini API URL:', config.gemini.apiUrl);
console.log('');

console.log('Groq Keys Count:', config.groq.apiKeys.length);
console.log('Groq Keys:', config.groq.apiKeys.map(k => k.substring(0, 20) + '...'));
console.log('Groq API URL:', config.groq.apiUrl);
console.log('');

if (config.gemini.apiKeys.length === 0 && config.groq.apiKeys.length === 0) {
  console.error('❌ ERROR: No API keys configured!');
  console.error('Please check your .env file and ensure GEMINI_API_KEYS and/or GROQ_API_KEYS are set.');
  process.exit(1);
}

console.log('✅ API keys loaded successfully!');
