import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  Widget,
  ExecutionContext
} from '@nitrostack/core';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';


@Controller()
export class FusionEngineTool {

  @Tool({
    name: 'run_fusion_engine',
    description: 'Combines Git and Meeting Intelligence into a single score and role classification stored in DuckDB.',
    inputSchema: z.object({})
  })
  @Widget('fusion-intelligence')
  async fuseIntelligence(_: {}, ctx: ExecutionContext) {
    const meetingFile = path.join(process.cwd(), 'meeting_intelligence.json');
    const gitFile = path.join(process.cwd(), 'git_intelligence.json');

    if (!fs.existsSync(meetingFile) || !fs.existsSync(gitFile)) return { error: 'Missing source files.' };

    const meeting = JSON.parse(fs.readFileSync(meetingFile, 'utf-8'));
    const git = JSON.parse(fs.readFileSync(gitFile, 'utf-8'));

    const meetingPeople: Record<string, any> = {};
    meeting.member_analysis.forEach((m: any) => { meetingPeople[m.name.toLowerCase()] = m; });

    const gitPeople: Record<string, any> = {};
    git.members.forEach((g: any) => { gitPeople[g.name.toLowerCase()] = g; });

    const allUsers = Array.from(new Set([...Object.keys(meetingPeople), ...Object.keys(gitPeople)]));
    const finalTeam = allUsers.map(user => {
      const meet = meetingPeople[user] || {};
      const gitp = gitPeople[user] || {};
      const meetingScore = meet.involvement_score || 0;
      const gitScore = gitp.git_scores?.git_score || 0;
      const mergedScore = Number(((meetingScore * 0.4) + (gitScore * 0.6)).toFixed(2));

      return {
        name: user,
        merged_score: mergedScore,
        final_behavior: gitp.git_behavior || 'Observer',
        git_score: gitScore,
        meeting_score: meetingScore
      };
    }).sort((a, b) => b.merged_score - a.merged_score);

    const generatedAt = new Date().toISOString();
    const finalOutput = { generated_at: generatedAt, members: finalTeam };
    fs.writeFileSync(path.join(process.cwd(), 'final_team_intelligence.json'), JSON.stringify(finalOutput, null, 2));

    return {
      fusion_intelligence: finalOutput
    };
  }
}
