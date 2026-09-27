import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_API_KEYS = (process.env.GEMINI_API_KEYS || '').split(',').filter(k => k.trim());

async function testGeminiAPI() {
  console.log('=== Testing Gemini API ===\n');
  console.log(`Testing with ${GEMINI_API_KEYS.length} API keys...\n`);

  for (let i = 0; i < GEMINI_API_KEYS.length; i++) {
    const apiKey = GEMINI_API_KEYS[i];
    console.log(`Testing key ${i + 1}/${GEMINI_API_KEYS.length}: ${apiKey.substring(0, 20)}...`);

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: 'Say "Hello, I am working!" in JSON format: {"message": "your response"}'
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`✅ Key ${i + 1} works! Response:`, content);
      console.log('');
    } catch (error: any) {
      if (error.response) {
        console.error(`❌ Key ${i + 1} failed (${error.response.status}):`, error.response.data);
      } else {
        console.error(`❌ Key ${i + 1} failed:`, error.message);
      }
      console.log('');
    }
  }
}

testGeminiAPI().catch(console.error);
