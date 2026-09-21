import Groq from "groq-sdk";

export class GroqService {
  private client: Groq | null = null;
  private cache = new Map<string, string>();

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && apiKey !== "your_groq_api_key_here") {
      this.client = new Groq({ apiKey });
    }
  }

  async generateJustification(
    libraryName: string,
    projectType: string,
    framework: string,
    fallbackReasoning: string
  ): Promise<string> {
    const cacheKey = `${libraryName}:${projectType}:${framework}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (!this.client) {
      return fallbackReasoning;
    }

    try {
      const response = await this.client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              "You are an expert frontend architect. Provide exactly ONE concise sentence (max 30 words) justifying why the selected UI/animation library is optimal for the project. Be direct and technical.",
          },
          {
            role: "user",
            content: `Explain why ${libraryName} is the best fit for a ${framework} project building a ${projectType} application.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 60,
      });

      const justification = response.choices[0]?.message?.content?.trim();
      if (justification) {
        this.cache.set(cacheKey, justification);
        return justification;
      }
    } catch (error) {
      console.warn(`Groq API call failed for ${libraryName}, using fallback reasoning:`, error);
    }

    return fallbackReasoning;
  }
}
