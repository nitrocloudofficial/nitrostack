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
export class GitIntelligenceTool {

  @Tool({
    name: 'calculate_git_intelligence',
    description: 'Analyzes git commits, pull requests, and code reviews to generate Git Intelligence scores for each team member. Shows work importance, PR involvement, comment quality, activity level, and collaboration health. Use this to get detailed git breakdown by member.',
    inputSchema: z.object({
      commitsCsvPath: z.string().default('github_data/commits.csv'),
      prsCsvPath: z.string().default('github_data/pull_requests.csv'),
      reviewsCsvPath: z.string().default('github_data/reviews.csv')
    })
  })
  @Widget('git-intelligence')
  async processGitData(input: any, ctx: ExecutionContext) {

    input = {
      commitsCsvPath: 'github_data/commits.csv',
      prsCsvPath: 'github_data/pull_requests.csv',
      reviewsCsvPath: 'github_data/reviews.csv',
      ...(input ?? {})
    };

    const parseCsv = (filePath?: string) => {
      if (!filePath) {
        throw new Error('CSV path is missing.');
      }

      const absolutePath = path.join(process.cwd(), filePath);

      if (!fs.existsSync(absolutePath)) {
        return [];
      }

      const content = fs.readFileSync(absolutePath, 'utf-8').trim();

      if (!content) {
        return [];
      }

      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());

        return headers.reduce(
          (acc, h, idx) => ({ ...acc, [h]: values[idx] }),
          {} as Record<string, string>
        );
      });
    };

    const commits = parseCsv(input.commitsCsvPath);
    const prs = parseCsv(input.prsCsvPath);
    const reviews = parseCsv(input.reviewsCsvPath);

    const people: Record<string, { commits: any[]; prs: any[]; reviews: any[]; blocked: number }> = {};

    const getPerson = (user: string) => {
      if (!people[user]) {
        people[user] = {
          commits: [],
          prs: [],
          reviews: [],
          blocked: 0
        };
      }

      return people[user];
    };

    commits.forEach(c => getPerson(c.user).commits.push(c));

    prs.forEach(p => {
      const person = getPerson(p.user);
      person.prs.push(p);

      if (p.merged === 'False') {
        person.blocked += 1;
      }
    });

    reviews.forEach(r => getPerson(r.reviewer).reviews.push(r));

    const allPeople = Object.entries(people);

    const maxCommits = Math.max(
      ...allPeople.map(([_, p]) => p.commits.length),
      1
    );

    const maxPrs = Math.max(
      ...allPeople.map(([_, p]) => p.prs.length),
      1
    );

    const members = allPeople.map(([user, data]) => {

      let importance = 0;

      data.commits.forEach(c => {
        importance += parseInt(c.core_files || '0', 10) * 3;
        importance += parseInt(c.files_changed || '0', 10);
        importance += Math.min(
          10,
          parseInt(c.total_changes || '0', 10) / 40
        );
      });

      const workImportance = Math.min(100, importance);
      const prInvolvement = (data.prs.length / maxPrs) * 100;

      const approvals = data.reviews.filter(
        r => r.state === 'APPROVED'
      ).length;

      const changes = data.reviews.filter(
        r => r.state === 'CHANGES_REQUESTED'
      ).length;

      const commentQuality = Math.min(
        100,
        approvals * 20 + changes * 10
      );

      const activity = (data.commits.length / maxCommits) * 100;

      const collaborationHealth = Math.max(
        0,
        100 - data.blocked * 20
      );

      const gitScore = Number((
        workImportance * 0.35 +
        prInvolvement * 0.25 +
        commentQuality * 0.20 +
        activity * 0.10 +
        collaborationHealth * 0.10
      ).toFixed(1));

      let gitBehavior = 'Observer';

      if (workImportance > 70 && activity < 50)
        gitBehavior = 'Silent Architect';
      else if (workImportance > 60 && collaborationHealth < 50)
        gitBehavior = 'Firefighter';
      else if (commentQuality > 60 && collaborationHealth > 60)
        gitBehavior = 'Mentor';
      else if (activity > 70 && workImportance < 50)
        gitBehavior = 'Noisy Contributor';
      else if (prInvolvement > 50 && collaborationHealth > 60)
        gitBehavior = 'Coordinator';

      return {
        name: user,
        git_scores: {
          work_importance: Number(workImportance.toFixed(1)),
          pr_involvement: Number(prInvolvement.toFixed(1)),
          comment_quality: Number(commentQuality.toFixed(1)),
          activity: Number(activity.toFixed(1)),
          collaboration_health: Number(collaborationHealth.toFixed(1)),
          git_score: gitScore
        },
        git_behavior: gitBehavior
      };

    }).sort(
      (a, b) => b.git_scores.git_score - a.git_scores.git_score
    );

    const generatedAt = new Date().toISOString();

    const result = {
      generated_at: generatedAt,
      members
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'git_intelligence.json'),
      JSON.stringify(result, null, 2)
    );


    return {
      git_intelligence: result
    };
  }
}
