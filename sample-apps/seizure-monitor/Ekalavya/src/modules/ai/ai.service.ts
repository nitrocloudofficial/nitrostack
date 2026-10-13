import { Injectable } from '@nitrostack/core';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private client: OpenAI;
  private modelId: string = 'llama-3.3-70b-versatile';

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key',
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async analyzeResume(text: string, targetRole: string) {
    const prompt = `
      Analyze this resume for a ${targetRole} role. 
      Return a JSON object with: 
      1. 'personal_details': { "name": "...", "email": "...", "phone": "..." }
      2. 'education': [ { "degree": "...", "university": "...", "year": "..." } ]
      3. 'experience': [ { "role": "...", "company": "...", "duration": "...", "description": "..." } ]
      4. 'current_skills' (list)
      5. 'skill_gaps' (list)
      6. 'growth_stage' (string: Seed, Sprout, or Sapling)
      
      Resume: ${text}
      
      Return ONLY valid JSON.
    `;

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages: [
        { role: 'system', content: 'You are an expert career coach and resume analyzer. Return JSON only.' },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content || '{}';
    const rawData = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawData);
  }

  async generateProjects(skillGaps: string[]) {
    const prompt = `
      Based on these missing skills: ${skillGaps.join(', ')}.
      Generate EXACTLY 9 progressive, hands-on software development projects that will teach these skills.
      The projects MUST be structured as:
      - 3 Projects: Difficulty "Easy"
      - 3 Projects: Difficulty "Medium"
      - 3 Projects: Difficulty "Hard"
      
      Output format:
      {
        "projects": [
          {
            "id": "unique-uuid",
            "title": "Project Title",
            "description": "Short description",
            "tech": ["Tech1", "Tech2"],
            "difficulty": "Easy/Medium/Hard",
            "icon": "code",
            "color": "from-blue-500 to-cyan-500"
          }
        ]
      }
      Return ONLY valid JSON.
    `;

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages: [
        { role: 'system', content: 'You are an expert project generator. Return JSON only.' },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content || '{}';
    const rawData = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawData);
  }

  async generateProjectPhases(projectTitle: string, techStack: string) {
    const prompt = `
      Project: "${projectTitle}" using ${techStack}.
      Break this project down into exactly 6 distinct, progressive phases.
      For each phase, provide:
      1. "id": phase index (1-6)
      2. "title": A clear, professional phase name (e.g. "Backend Setup").
      3. "description": A brief 1-sentence overview.
      4. "tasks": A list of 3-5 specific, actionable bullet points (strings).
      5. "resources": A list of 2-3 objects { "label": "Doc Name", "url": "URL" }.
      Return a JSON list of objects.
    `;

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages: [
        { role: 'system', content: 'You are a technical project manager. Return JSON only.' },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content || '[]';
    const rawData = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawData);
  }

  async chatArchitect(message: string, code: string, context: any) {
    const prompt = `
      User Message: ${message}
      Current Code:
      ${code}
      
      Project Context: ${JSON.stringify(context)}
      
      You are the Ekalavya Foundry Architect, a mentor guiding the user through a project-based learning platform.
      Rules:
      1. Guide the user and explain concepts, but if they explicitly ask for the answer, the code, or to move on, YOU MUST GIVE IT TO THEM. Do not be overly strict.
      2. Understand the app context: The user is in "The Foundry" (a Project Lab) trying to complete a phase.
      3. **Agentic Actions**: You have the power to take actions in the user's UI. If the user asks you to write code for them, or if you provide a code solution, YOU MUST include an UPDATE_CODE action. If the user asks to unlock the next phase or move on, YOU MUST include an UNLOCK_PHASE action.
      4. Return ONLY a JSON object with this exact structure (no markdown code blocks around it):
      {
        "response": "Your response message here...",
        "actions": [
          // If providing code or asked to write code:
          // { "type": "UPDATE_CODE", "code": "def hello():\\n    pass" }
          // If the user asks to unlock the phase or if they have completed it:
          // { "type": "UNLOCK_PHASE" }
        ]
      }
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          { role: 'system', content: 'You are an expert technical mentor. Return JSON only.' },
          { role: 'user', content: prompt }
        ]
      });

      const content = response.choices[0].message.content || '{}';
      const rawData = content.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(rawData);
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  }

  async simulateTerminal(code: string) {
    const prompt = `
      You are a strict, emotionless terminal runtime environment.
      Your ONLY job is to execute the following code in your mind and output the EXACT standard output (stdout), standard error (stderr), or compilation errors that this code would produce.
      
      Rules:
      1. DO NOT include any conversational text, explanations, or markdown blocks.
      2. If the code has syntax errors or runtime exceptions, output the exact stack trace or error message.
      3. If the code succeeds, output exactly what would be printed to the console.
      4. If the code prints nothing, output exactly "[No output]".
      
      Code to execute:
      ${code}
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          { role: 'system', content: 'You are a terminal emulator. Output only the execution result.' },
          { role: 'user', content: prompt }
        ]
      });

      return response.choices[0].message.content || "[No output]";
    } catch (error) {
      console.error("AI Service Error:", error);
      return "Terminal simulation failed due to server error.";
    }
  }

  async careerMentor(message: string, context: any = {}) {
    const prompt = `
      User Message: ${message}
      
      User Profile Context (Parsed Resume): ${JSON.stringify(context.profile || {})}
      Projects Generated for User: ${JSON.stringify(context.generatedProjects || [])}
      Chat History: ${JSON.stringify(context.history || [])}
      
      You are the Ekalavya Career Mentor AI. 
      Rules:
      1. Be highly conversational, encouraging, and helpful. Use plain text formatting.
      2. Analyze the user's profile and generated projects to give personalized advice based on their resume gaps.
      3. CRITICAL: DO NOT generate projects or use JSON output unless the user EXPLICITLY asks to "generate projects", "create projects", or "replace projects" in the Project Lab.
      4. IF AND ONLY IF the user explicitly asks to generate/replace projects, you MUST output ONLY a JSON response (with NO conversational text before or after it) containing the action "REPLACE_PROJECTS" and a new array of 9 projects (3 Easy, 3 Medium, 3 Hard) like this:
         {
           "actions": [
             {
               "type": "REPLACE_PROJECTS",
               "projects": [
                 {
                   "title": "New Project 1",
                   "description": "Description...",
                   "tech": ["Tech1"],
                   "difficulty": "Easy/Medium/Hard",
                   "icon": "code",
                   "color": "from-blue-500 to-cyan-500"
                 }
               ]
             }
           ],
           "reply": "I have regenerated 9 new projects for you in the Project Lab based on your request!"
         }
      5. Otherwise, respond naturally without markdown blocks or JSON.
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          { role: 'system', content: 'You are a highly concise career mentor.' },
          { role: 'user', content: prompt }
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("AI Service Error:", error);
      throw error;
    }
  }

  async dashboardArchitect(prompt: string, context: any) {
    const systemPrompt = `
      You are The Architect, an expert software engineer and mentor on the Ekalavya platform.
      The user is chatting with you on the main Dashboard. 
      Your goal is to converse with them about their project ideas, guide them, and only generate a blueprint if they explicitly ask for one (e.g., "build this", "generate blueprint").

      If they just say "hi" or ask questions, respond naturally in a helpful, concise manner without any JSON.
      
      IF AND ONLY IF the user explicitly asks to generate or build a project blueprint, output ONLY a JSON object exactly like this:
      {
        "action": "CREATE_PROJECT",
        "project": {
          "title": "A catchy title",
          "description": "A solid description of the project.",
          "tech": ["React", "Node"],
          "icon": "code",
          "current_phase": 1,
          "phases": [
            { "id": 1, "title": "Setup", "description": "Env setup", "tasks": ["Task 1", "Task 2"] },
            { "id": 2, "title": "Backend", "description": "API setup", "tasks": ["Task 1", "Task 2"] },
            { "id": 3, "title": "Frontend", "description": "UI setup", "tasks": ["Task 1", "Task 2"] },
            { "id": 4, "title": "Deployment", "description": "Go live", "tasks": ["Task 1", "Task 2"] }
          ]
        },
        "reply": "I have successfully built a blueprint for your project! I've added it to your Project Lab."
      }

      Do not wrap the JSON in markdown blocks. Just output the raw JSON if generating a project. Otherwise, output plain text.
    `;

    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error("Dashboard Architect Error:", error);
      throw error;
    }
  }

  async searchJobsWithTavily(role: string, skills: string[]) {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        throw new Error("TAVILY_API_KEY is not configured.");
      }

      const query = `${role} jobs "${skills.join('" OR "')}" site:linkedin.com/jobs OR site:glassdoor.com`;
      
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "basic",
          include_answer: false,
          max_results: 5,
        })
      });

      const data: any = await response.json();
      
      if (!data.results) {
         return [];
      }

      return data.results.map((r: any) => ({
        title: r.title.replace(' | LinkedIn', '').replace(' | Glassdoor', '').substring(0, 60),
        company: r.content.substring(0, 40) + '...', // Fallback company guess
        url: r.url,
        source: r.url.includes('linkedin') ? 'LinkedIn' : 'Glassdoor',
        match_score: Math.floor(Math.random() * 20) + 80, // Mock score between 80-99
        location: "Remote / Hybrid",
        salary: "Market Rate",
        type: "Full-Time",
        description: r.content.substring(0, 150) + '...',
        skills: skills.slice(0, 3), // Show first 3 matching skills
        posted: "Just now",
        applicants: Math.floor(Math.random() * 100) + 10
      }));
    } catch (e) {
      console.error("Tavily Search Error", e);
      return [];
    }
  }
}
