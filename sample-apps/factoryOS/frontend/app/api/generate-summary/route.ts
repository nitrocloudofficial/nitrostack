import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'GEMINI_API_KEY environment variable missing on server.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { 
      machine = 'Machine M12', 
      diagnosis = 'Bearing Failure', 
      supplier = 'Apex Industrial Parts (SUP-A)', 
      agentActions = [], 
      financialImpact = '92% ($8,800) loss reduction' 
    } = body;

    const prompt = `You are the Chief Operations AI Officer for a smart factory control system. Generate an executive, highly descriptive, and professional executive synthesis (3 to 4 detailed sentences) for C-suite leadership summarizing the following incident recovery:

- Affected Node & Diagnosis: ${machine} (${diagnosis})
- Primary Supplier Sourced: ${supplier}
- Autonomous Agent Execution Sequence: ${Array.isArray(agentActions) ? agentActions.join(' -> ') : String(agentActions)}
- Financial & Operational Impact: ${financialImpact}

Instructions:
1. Clearly state the initial sensor anomaly detected by IoT telemetry and the Random Forest machine learning prediction.
2. Detail how the autonomous Inventory, Procurement, and Production AI agents coordinated safety stock checks, emergency supplier procurement, and line rebalancing.
3. Quantify the final financial loss reduction and operational recovery achieved.
4. Output strictly a single, highly articulate, descriptive paragraph without markdown tags, bullet points, or headers.`;

    const modelsToTry = [
      'models/gemini-2.0-flash',
      'models/gemini-2.5-flash',
      'models/gemini-2.0-flash-lite',
      'models/gemini-1.5-flash',
      'models/gemini-1.5-pro'
    ];

    let summaryText = '';

    for (const model of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.3 }
          })
        }).catch(() => null);

        clearTimeout(timeoutId);

        if (geminiRes && geminiRes.ok) {
          const json = await geminiRes.json().catch(() => null);
          const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            summaryText = text;
            break;
          }
        }
      } catch {}
    }

    if (!summaryText) {
      return NextResponse.json({ success: false, message: 'Gemini API call failed or quota unavailable.' }, { status: 502 });
    }

    return NextResponse.json({ success: true, summary: summaryText });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Server error' }, { status: 500 });
  }
}
