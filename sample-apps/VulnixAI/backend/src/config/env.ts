import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment-specific .env file
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  // In production (NitroStack Cloud), load .env.production
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, '../../.env.production') });
} else {
  dotenv.config();
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/vulnixai',
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
  },
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
    apiKeys: (process.env.GROQ_API_KEYS || '').split(',').filter(k => k.trim()),
  },
  gemini: {
    apiKeys: (process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim()),
    apiUrl: process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
  },
  nodeEnv: process.env.NODE_ENV || 'development',
};
