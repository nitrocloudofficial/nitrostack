import { ControllerDecorator as Controller, ToolDecorator as Tool, ExecutionContext, z } from '@nitrostack/core';
import { DatabaseService } from '../database/database.service.js';
import { AiService } from '../ai/ai.service.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

function decodeBase64File(content: string): Buffer {
  const matches = content.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    return Buffer.from(matches[2], 'base64');
  }
  return Buffer.from(content, 'base64');
}

@Controller('resume')
export class ResumeTools {
  constructor(
    private readonly db: DatabaseService,
    private readonly ai: AiService
  ) {}

  @Tool({
    name: 'analyze',
    description: 'Upload a resume PDF to extract profile info, identify skill gaps, and generate learning projects.',
    inputSchema: z.object({
      userId: z.number().describe('The ID of the user uploading the resume'),
      targetRole: z.string().describe('The target job role the user wants'),
      file_name: z.string().describe('Name of the uploaded PDF file'),
      file_type: z.string().describe('MIME type (must be application/pdf)'),
      file_content: z.string().describe('Base64 encoded file content'),
    })
  })
  async analyzeResume(input: any, ctx: ExecutionContext) {
    ctx.logger.info(`Analyzing resume for user ${input.userId} target role ${input.targetRole}`);
    
    // Parse PDF
    const buffer = decodeBase64File(input.file_content);
    let parsedText = '';
    try {
      const data = await pdfParse(buffer);
      parsedText = data.text;
    } catch (err) {
      ctx.logger.error(`Failed to parse PDF: ${err}`);
      throw new Error('Failed to parse PDF file');
    }

    if (!parsedText.trim()) {
      throw new Error('PDF appears to be empty or image-based, which is not supported currently.');
    }

    // 1. Mirror Agent Call (Profile Extraction)
    const profileData = await this.ai.analyzeResume(parsedText, input.targetRole);
    
    // 2. Lab Agent Call (Project Generation based on gaps)
    const skillGaps = profileData.skill_gaps || [];
    let projectsData: any = { projects: [] };
    if (skillGaps.length > 0) {
      projectsData = await this.ai.generateProjects(skillGaps);
    }

    // Ensure dummy user exists for foreign key constraint
    await this.db.user.upsert({
      where: { id: input.userId },
      update: {},
      create: {
        id: input.userId,
        email: 'test@example.com',
        fullName: 'Test User',
        passwordHash: 'dummy'
      }
    });

    // 3. Save to DB
    const profile = await this.db.profile.create({
      data: {
        userId: input.userId,
        role: input.targetRole,
        fullName: profileData.personal_details?.name || 'Unknown',
        email: profileData.personal_details?.email || 'Unknown',
        analysisJson: profileData,
        projectsJson: projectsData.projects,
        growthStage: profileData.growth_stage || 'Sprout',
      }
    });

    return {
      success: true,
      profileId: profile.id,
      profile: profileData,
      recommendedProjects: projectsData.projects,
    };
  }

  @Tool({
    name: 'build_resume',
    description: 'Build an optimized resume based on job description',
    inputSchema: z.object({
      jobDescription: z.string()
    })
  })
  async buildResume(input: { jobDescription: string }) {
    // Dummy response for now
    return {
      success: true,
      personal_details: {
        name: "Developer Name",
        email: "dev@example.com",
        phone: "+1 234 567 890"
      },
      summary: "Experienced developer tailored for " + input.jobDescription.substring(0, 20) + "...",
      projects_section: [],
      experience_section: [],
      education_section: [],
      skills_section: ["React", "TypeScript", "Node.js"],
      improvement_tips: "Looking good!"
    };
  }
}
