import * as cron from 'node-cron';
import { GitIntelligenceTool } from '../tools/git_intelligence.tool.js';
import { MeetingIntelligenceTool } from '../tools/meeting_intelligence.tool.js';
import { FusionEngineTool } from '../tools/fusion_engine.tool.js';

export class PipelineService {
  constructor(
    private gitTool: GitIntelligenceTool,
    private meetingTool: MeetingIntelligenceTool,
    private fusionTool: FusionEngineTool
  ) {
    this.startScheduler();
  }

  private startScheduler() {
    // FIXED: Changed all console.log to console.error to protect the STDIO JSON stream
    console.error('🤖 Automation System Online.');
    
    cron.schedule('30 9 * * *', async () => {
      console.error(`🏎️ Running Daily Pipeline at ${new Date().toLocaleString()}`);
      try {
        await this.gitTool.processGitData({ 
          commitsCsvPath: 'github_data/commits.csv', 
          prsCsvPath: 'github_data/pull_requests.csv', 
          reviewsCsvPath: 'github_data/reviews.csv' 
        }, {} as any);
        
        await this.meetingTool.processMeetingData({ 
          transcriptPath: 'meeting_transcript.txt' 
        }, {} as any);
        
        await this.fusionTool.fuseIntelligence({}, {} as any);
        
        console.error('🏁 Pipeline completed successfully.');
      } catch (error) {
        console.error('❌ Pipeline crashed:', error);
      }
    });
  }
}