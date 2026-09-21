import dotenv from 'dotenv';
dotenv.config();

const key = process.env.FOCUSOPS_LLM_API_KEY || process.env.LLM_API_KEY || '';
const testPrompt = 'How do you prioritize tasks? 2 sentences only.';

// Try models in order until one works
const candidates = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'nvidia/nemotron-3-nano-30b-a3b:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
  'inclusionai/ling-3.0-flash:free'
];

for (const model of candidates) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://focusops.app',
      'X-Title': 'FocusOps'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are FocusOps AI.' },
        { role: 'user', content: testPrompt }
      ],
      max_tokens: 100
    })
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`✅ WORKS: ${model}`);
    console.log('Reply:', data.choices?.[0]?.message?.content);
    break;
  } else {
    console.log(`❌ ${model}: ${data.error?.message?.slice(0, 80)}`);
  }
}
