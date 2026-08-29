import 'dotenv/config';

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  
  if (!apiKey) {
    console.error('❌ No GEMINI_API_KEY found in environment.');
    process.exit(1);
  }

  console.log(`🔌 Testing key: "${apiKey.substring(0, 12)}..."`);
  console.log(`🤖 Using model: "${model}"`);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        parts: [
          { text: "Hello! Respond with a single word 'OK' if you receive this." }
        ]
      }
    ]
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const status = res.status;
    const body = await res.json();

    console.log(`\n📬 HTTP Status: ${status}`);
    console.log('📦 Raw Response Body:\n', JSON.stringify(body, null, 2));

    if (status === 200) {
      console.log('\n✅ Key is ACTIVE and working correctly!');
    } else {
      console.error('\n❌ Key is NOT working (Quota/Auth error).');
    }
  } catch (err: any) {
    console.error('❌ Request failed:', err.message);
  }
}

main();
