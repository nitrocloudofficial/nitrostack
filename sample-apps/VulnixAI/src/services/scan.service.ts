import { API_ENDPOINTS } from '../config/api';
import { AuthService } from './auth.service';
import type { ScanResult, ScanLog } from '../types/sentinel';

export interface StartScanRequest {
  repoId: string;
  repoName: string;
  repoFullName: string;
  repoUrl?: string;
  defaultBranch?: string;
}

export interface ScanStatusResponse {
  id: string;
  repoName: string;
  repoFullName: string;
  status: 'queued' | 'scanning' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
    patchable: number;
  };
  logs: ScanLog[];
  error?: string;
}

export class ScanService {
  static async startScan(request: StartScanRequest): Promise<{ scanId: string; status: string }> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(API_ENDPOINTS.scan.start, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start scan');
      }

      return await response.json();
    } catch (error) {
      console.error('Error starting scan:', error);
      throw error;
    }
  }

  static async getScanStatus(scanId: string): Promise<ScanStatusResponse> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(API_ENDPOINTS.scan.status(scanId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get scan status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting scan status:', error);
      throw error;
    }
  }

  static async getScanResults(scanId: string): Promise<ScanResult> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(API_ENDPOINTS.scan.results(scanId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get scan results');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting scan results:', error);
      throw error;
    }
  }

  static async getScanHistory(limit = 50): Promise<ScanResult[]> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.scan.history}?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get scan history');
      }

      const data = await response.json();
      return data.scans;
    } catch (error) {
      console.error('Error getting scan history:', error);
      throw error;
    }
  }

  static async createFixPR(scanId: string): Promise<{ prUrl: string; prNumber: number; fixedCount: number }> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(API_ENDPOINTS.scan.createPR(scanId), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create pull request');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating PR:', error);
      throw error;
    }
  }

  static async getFileContent(scanId: string, filePath: string): Promise<{ path: string; content: string; sha: string; size: number }> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(API_ENDPOINTS.scan.getFile(scanId, filePath), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch file content');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching file:', error);
      throw error;
    }
  }

  static async updateFileContent(
    scanId: string,
    filePath: string,
    content: string,
    sha: string,
    commitMessage: string
  ): Promise<void> {
    const token = AuthService.getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(API_ENDPOINTS.scan.updateFile(scanId, filePath), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content, sha, commitMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update file');
      }
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }
}
