

export interface XAIPayload {
  health_score_explanation: string;
  path_justifications: {
    path_name: string;
    justification: string;
  }[];
}

export async function generateXAIExplanation(
  healthScores: any,
  paths: any
): Promise<XAIPayload> {
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (apiKey && apiKey !== '') {
    try {
      return await callGeminiAPI(apiKey, healthScores, paths);
    } catch (err) {
      console.warn('Gemini API failed, falling back to deterministic XAI.', err);
      return generateDeterministicXAI(healthScores, paths);
    }
  } else {
    console.log('No Gemini API Key found. Using deterministic XAI fallback.');
    return generateDeterministicXAI(healthScores, paths);
  }
}

async function callGeminiAPI(
  apiKey: string,
  healthScores: any,
  paths: any
): Promise<XAIPayload> {
  const prompt = `
You are an Explainable AI (XAI) for a fintech platform. You are forbidden from altering the math or calculating new allocations. You will receive a user's 6-dimension health scores and 3 generated wealth paths. Your ONLY job is to write a short, empathetic, plain-English explanation of WHY the system generated these scores and paths. Translate the JSON data into a cohesive summary. For example, explain why the Safe Path is heavily allocating money to debt prepayment because their Debt Management score is critically low.

Health Scores:
${JSON.stringify(healthScores.dimensions, null, 2)}
Master Score: ${healthScores.masterScore}

Wealth Paths:
${JSON.stringify(paths, null, 2)}

Return ONLY valid JSON matching this schema exactly, with no markdown formatting around it:
{
  "health_score_explanation": "Overall diagnosis text...",
  "path_justifications": [
    { "path_name": "Safe Path", "justification": "Why safe path was chosen..." },
    { "path_name": "Balanced Path", "justification": "Why balanced path was chosen..." },
    { "path_name": "Aggressive Path", "justification": "Why aggressive path was chosen..." }
  ]
}
  `;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { response_mime_type: 'application/json' }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from Gemini');

  return JSON.parse(text);
}

function generateDeterministicXAI(
  healthScores: any,
  paths: any
): XAIPayload {
  const { emergencyFund, debtManagement, activeInvestments, retirement } = healthScores.dimensions;
  
  let health_score_explanation = `Your master health score is ${healthScores.masterScore}/100. `;
  if (emergencyFund < 50 || debtManagement < 50) {
    health_score_explanation += `Your safety buckets require immediate attention (Emergency: ${emergencyFund}, Debt: ${debtManagement}). Focus on building your liquid buffer and reducing your debt-to-income ratio before taking aggressive market risks.`;
  } else if (activeInvestments < 50 || retirement < 50) {
    health_score_explanation += `Your financial foundations are stable, but your wealth accumulation requires acceleration (Investments: ${activeInvestments}, Retirement: ${retirement}). You need to increase your monthly investments to reach your long-term goals.`;
  } else {
    health_score_explanation += `You have an exceptionally balanced financial profile across all RBI/SEBI benchmarks (Avg Score: ${Math.round((emergencyFund + debtManagement + activeInvestments + retirement)/4)}). Your liquidity, debt, and investments are optimally aligned.`;
  }

  const path_justifications = [
    {
      path_name: 'Safe Path',
      justification: emergencyFund < 80 
        ? `This path aggressively targets your lowest scoring dimension (${emergencyFund}/100 Emergency Fund) by funneling 80% of your idle cash directly into highly liquid assets to quickly build a 6-month safety net.`
        : debtManagement < 80 
          ? `Because your Debt Management score is sub-optimal (${debtManagement}/100), this path prioritizes deleveraging. It routes 80% of idle cash to prepay high-interest debt, instantly lowering your FOIR risk.`
          : `Since your safety foundations are already strong, this conservative path protects your capital by allocating to low-volatility hybrid funds and fixed deposits to prevent downside risk.`
    },
    {
      path_name: 'Balanced Path',
      justification: `This path mathematically spreads your risk. By dividing your idle cash perfectly in three, you simultaneously boost your liquidity buffer, compound wealth in index funds, and slowly chip away at debt principal without sacrificing one goal for another.`
    },
    {
      path_name: 'Aggressive Path',
      justification: (emergencyFund < 50 || debtManagement < 50)
        ? `WARNING: This path ignores your critical safety deficits (Emergency/Debt scores < 50) and forces 80% of your capital into high-growth equity. This maximizes long-term yield but exposes you to severe short-term liquidity shocks.`
        : `Because your baseline financial security is rock-solid, this path deploys 80% of your idle cash directly into Mid and Small-Cap equities, taking calculated risks to rapidly accelerate your ${healthScores.dimensions.retirement}/100 Retirement Readiness.`
    }
  ];

  return {
    health_score_explanation,
    path_justifications
  };
}
