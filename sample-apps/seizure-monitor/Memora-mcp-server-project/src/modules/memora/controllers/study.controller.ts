import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget } from '@nitrostack/core';
import { z } from 'zod';

@Controller('study')
export class StudyController {
    @Tool({
        name: 'quiz_start',
        description: 'Generates 5 multiple choice questions for a specific topic within a course using Groq.',
        inputSchema: z.object({
            course_name: z.string().describe('The name of the course (e.g. IFRS, Machine Learning)'),
            topic: z.string().describe('The specific topic to generate a quiz for'),
            difficulty: z.enum(['easy', 'medium', 'hard']).default('medium')
        })
    })
    @Widget('quiz')
    async generateQuiz(params: { course_name: string; topic: string; difficulty: string }) {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert examiner. Generate 5 highly diverse, non-repeating questions mixing these types: multiple_choice, true_false, and short_answer. Ensure they are completely different from any standard questions to test true understanding. Format MUST be JSON: { "questions": [ { "type": "multiple_choice | true_false | short_answer", "question": "string", "options": ["string"] (only if multiple_choice), "answer": "exact string of correct option/answer", "explanation": "string" } ] }`
                    },
                    {
                        role: 'user',
                        content: `Course: ${params.course_name}\nTopic: ${params.topic}\nDifficulty: ${params.difficulty}\nRandomization Seed: ${Date.now()}`
                    }
                ]
            })
        });

        if (!groqRes.ok) throw new Error("Groq API failed");
        const groqData = await groqRes.json() as any;
        const parsed = JSON.parse(groqData.choices[0].message.content);

        return {
            course_name: params.course_name,
            topic: params.topic,
            difficulty: params.difficulty,
            questions: parsed.questions || [],
            success: true
        };
    }

    @Tool({
        name: 'flashcards_generate',
        description: 'Generates flashcards for a specific topic within a course.',
        inputSchema: z.object({
            course_name: z.string().describe('The name of the course'),
            topic: z.string().describe('The specific topic to generate flashcards for')
        })
    })
    @Widget('flashcards')
    async generateFlashcards(params: { course_name: string; topic: string }) {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `You are a study assistant. Generate 5 key flashcards covering diverse, non-repeating concepts. Format MUST be JSON: { "cards": [ { "front": "string", "back": "string" } ] }`
                    },
                    {
                        role: 'user',
                        content: `Course: ${params.course_name}\nTopic: ${params.topic}\nRandomization Seed: ${Date.now()}`
                    }
                ]
            })
        });

        if (!groqRes.ok) throw new Error("Groq API failed");
        const groqData = await groqRes.json() as any;
        const parsed = JSON.parse(groqData.choices[0].message.content);

        return {
            course_name: params.course_name,
            topic: params.topic,
            cards: parsed.cards || [],
            success: true
        };
    }

    @Tool({
        name: 'cheatsheet_generate',
        description: 'Generates a dense cheatsheet for a topic within a course.',
        inputSchema: z.object({
            course_name: z.string().describe('The name of the course'),
            topic: z.string().describe('The specific topic to generate a cheatsheet for')
        })
    })
    @Widget('cheatsheet')
    async generateCheatsheet(params: { course_name: string; topic: string }) {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        if (!GROQ_API_KEY) throw new Error("Missing GROQ_API_KEY");

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert professor writing a dense cheatsheet. Use markdown with bullet points and bold text.`
                    },
                    {
                        role: 'user',
                        content: `Course Context: ${params.course_name}\nTopic: ${params.topic}`
                    }
                ]
            })
        });

        if (!groqRes.ok) throw new Error("Groq API failed");
        const groqData = await groqRes.json() as any;

        return {
            course_name: params.course_name,
            topic: params.topic,
            markdown: groqData.choices[0].message.content,
            success: true
        };
    }
}
