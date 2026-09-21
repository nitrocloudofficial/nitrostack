import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEYS = (process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim());

async function listGeminiModels() {
  console.log('=== Listing Available Gemini Models ===\n');
  
  const apiKey = GEMINI_API_KEYS[0];
  if (!apiKey) {
    console.error('No API key found!');
    return;
  }

  console.log(`Using key: ${apiKey.substring(0, 20)}...\n`);

  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    console.log('Available models:\n');
    const models = response.data.models || [];
    
    models.forEach((model: any) => {
      if (model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`✅ ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Description: ${model.description}`);
        console.log('');
      }
    });

    console.log('\nFlash models specifically:');
    models
      .filter((m: any) => m.name.toLowerCase().includes('flash'))
      .forEach((model: any) => {
        console.log(`- ${model.name}`);
      });

  } catch (error: any) {
    if (error.response) {
      console.error(`❌ Failed (${error.response.status}):`, error.response.data);
    } else {
      console.error(`❌ Failed:`, error.message);
    }
  }
}

listGeminiModels().catch(console.error);
