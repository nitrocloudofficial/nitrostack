import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { LabRepository } from '../../data/repositories/lab-repository.js';
import path from 'path';
import fs from 'fs';

export class clinicalResources {
  
  private labRepo = new LabRepository();

  @Resource({
    uri: 'labs://{userId}/latest',
    name: 'Latest Lab Report',
    description: 'Read this to obtain the user\'s most recent lab report, out-of-range analytes, and derived deficiency vectors. Use this to enforce clinical rules.',
    mimeType: 'application/json',
  })
  async getLatestLabs(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    // Format: labs://u1/latest
    const match = uri.match(/labs:\/\/([^/]+)\/latest/);
    const userId = match ? match[1] : null;

    if (!userId) throw new Error("Missing userId in URI");

    const reports = this.labRepo.getByUserId(userId);
    if (!reports || reports.length === 0) {
      throw new Error(`No lab reports found for user: ${userId}`);
    }

    // Sort descending by date
    reports.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime());
    const latest = reports[0];

    const filePath = path.join(process.cwd(), 'data', 'users', userId, 'labs.json');
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(latest, null, 2)
      }],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }

  @Resource({
    uri: 'labs://{userId}/history',
    name: 'Lab Report History',
    description: 'Read this to observe historical trends in the user\'s lab analytes across multiple reports.',
    mimeType: 'application/json',
  })
  async getLabHistory(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    const match = uri.match(/labs:\/\/([^/]+)\/history/);
    const userId = match ? match[1] : null;

    if (!userId) throw new Error("Missing userId in URI");

    const reports = this.labRepo.getByUserId(userId);
    if (!reports || reports.length === 0) {
      throw new Error(`No lab reports found for user: ${userId}`);
    }

    reports.sort((a, b) => new Date(a.report_date).getTime() - new Date(b.report_date).getTime());

    const filePath = path.join(process.cwd(), 'data', 'users', userId, 'labs.json');
    const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(reports, null, 2)
      }],
      annotations: { audience: ['any'], priority: 1 },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }
}

