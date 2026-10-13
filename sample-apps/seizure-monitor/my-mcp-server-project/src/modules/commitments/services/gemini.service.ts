import { GoogleGenAI } from "@google/genai";


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export class GeminiService {
  async extractCommitments(transcript: string): Promise<string> {
    try {
      const prompt = `
You are an expert meeting assistant.

Extract every commitment from the following meeting transcript.

Return ONLY a JSON array.

Each object must contain:
- who
- what
- dueDate
- meetingId
- status
- confidence

Transcript:

${transcript}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
      });

      console.log("AI response:", response);

      // Adjust if response.text is not correct
      const resultText = response.text || JSON.stringify(response);

      return resultText;
    } catch (error) {
      console.error("Failed to extract commitments:", error);
      throw error;
    }
  }
}