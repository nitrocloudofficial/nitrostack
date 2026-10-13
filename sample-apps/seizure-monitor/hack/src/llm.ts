import Groq from "groq-sdk";
import { GROQ_MODEL_FAST } from "./config.js";

const client = process.env.GROQ_API_KEY
  ? new Groq({ apiKey: process.env.GROQ_API_KEY })
  : undefined;

export async function askJson<T>(prompt: string, input: string, fallback: T): Promise<T> {
  if (!client) {
    return fallback;
  }

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL_FAST,
      messages: [
        { role: "system", content: "You are a precise JSON generator." },
        { role: "user", content: `${prompt}\n\nInput:\n${input}` }
      ],
      temperature: 0.1
    });

    const content = response.choices?.[0]?.message?.content ?? "";
    if (!content) {
      return fallback;
    }

    return JSON.parse(content) as T;
  } catch (error) {
    console.warn("LLM JSON request failed", error);
    return fallback;
  }
}

export async function askText(systemPrompt: string, userPrompt: string, fallback: string): Promise<string> {
  if (!client) {
    return fallback;
  }

  try {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL_FAST,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2
    });

    return response.choices?.[0]?.message?.content ?? fallback;
  } catch (error) {
    console.warn("LLM text request failed", error);
    return fallback;
  }
}