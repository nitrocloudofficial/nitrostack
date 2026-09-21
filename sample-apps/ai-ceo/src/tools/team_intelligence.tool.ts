import {
  ControllerDecorator as Controller,
  ToolDecorator as Tool,
  Widget,
  ExecutionContext
} from "@nitrostack/core";

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

@Controller()
export class TeamIntelligenceTool {

  @Tool({
    name: "get_team_intelligence",
    description:
      "Returns precomputed Git, Meeting and Fusion intelligence. Never ask the user for Git CSVs, meeting transcripts or recordings. Use the appropriate source depending on the question.",
    inputSchema: z.object({
      source: z
        .enum(["git", "meeting", "fusion", "all"])
        .default("all")
    }),
    invocation: {
      invoking: "Analyzing team intelligence...",
      invoked: "Team intelligence ready"
    },
    examples: {
      request: { source: "all" },
      response: {
        source: "Combined Intelligence",
        already_processed: true,
        git_intelligence: {
          members: [
            {
              name: "Asha Patel",
              git_scores: {
                work_importance: 82,
                pr_involvement: 76,
                comment_quality: 88,
                activity: 91,
                collaboration_health: 79,
                git_score: 83
              },
              git_behavior: "Consistent high-impact contributor"
            },
            {
              name: "Marco Lee",
              git_scores: {
                work_importance: 55,
                pr_involvement: 48,
                comment_quality: 60,
                activity: 52,
                collaboration_health: 65,
                git_score: 56
              },
              git_behavior: "Steady but lower activity"
            }
          ]
        },
        meeting_intelligence: {
          overall_meeting_summary:
            "The team reviewed sprint progress, discussed blockers on the payments integration, and aligned on next week's priorities.",
          meeting_topics: ["Sprint review", "Payments integration", "Q3 roadmap"],
          dominant_speakers: ["Asha Patel"],
          silent_speakers: ["Marco Lee"],
          member_analysis: [
            { name: "Asha Patel" },
            { name: "Marco Lee" }
          ]
        },
        fusion_intelligence: {
          members: [
            {
              name: "Asha Patel",
              merged_score: 85,
              git_score: 83,
              meeting_score: 87,
              final_behavior: "High engagement across code and meetings"
            },
            {
              name: "Marco Lee",
              merged_score: 54,
              git_score: 56,
              meeting_score: 52,
              final_behavior: "Needs more visibility in both channels"
            }
          ]
        }
      }
    }
  })
  @Widget('team-intelligence')
  async getTeamIntelligence(
    input: {
      source: "git" | "meeting" | "fusion" | "all";
    },
    ctx: ExecutionContext
  ) {

    const cwd = process.cwd();

    const git = JSON.parse(
      fs.readFileSync(path.join(cwd, "git_intelligence.json"), "utf8")
    );

    const meeting = JSON.parse(
      fs.readFileSync(path.join(cwd, "meeting_intelligence.json"), "utf8")
    );

    const fusion = JSON.parse(
      fs.readFileSync(path.join(cwd, "final_team_intelligence.json"), "utf8")
    );

    switch (input.source) {

      case "git":
        return {
          source: "Git Intelligence",
          already_processed: true,
          git_intelligence: git
        };

      case "meeting":
        return {
          source: "Meeting Intelligence",
          already_processed: true,
          meeting_intelligence: meeting
        };

      case "fusion":
        return {
          source: "Fusion Intelligence",
          already_processed: true,
          fusion_intelligence: fusion
        };

      default:
        return {
          source: "Combined Intelligence",
          already_processed: true,
          git_intelligence: git,
          meeting_intelligence: meeting,
          fusion_intelligence: fusion
        };
    }
  }
}
