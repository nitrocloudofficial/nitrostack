import axios from 'axios';
import { IVulnerability } from '../db/models/Scan.model.js';

interface FileChange {
  path: string;
  content: string;
}

export class GitHubPRService {
  private static readonly GITHUB_API_URL = 'https://api.github.com';

  /**
   * Create a pull request with security fixes
   */
  static async createSecurityFixPR(
    repoFullName: string,
    defaultBranch: string,
    vulnerabilities: IVulnerability[],
    accessToken: string
  ): Promise<{ prUrl: string; prNumber: number }> {
    try {
      // Step 1: Get the latest commit SHA from the default branch
      const refResponse = await axios.get(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/git/ref/heads/${defaultBranch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const latestCommitSha = refResponse.data.object.sha;

      // Step 2: Create a new branch for the fixes
      const branchName = `security-fixes-${Date.now()}`;
      await axios.post(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/git/refs`,
        {
          ref: `refs/heads/${branchName}`,
          sha: latestCommitSha,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      // Step 3: Get current file contents and apply fixes
      const fileChanges = await this.prepareFileChanges(
        repoFullName,
        defaultBranch,
        vulnerabilities,
        accessToken
      );

      // Step 4: Commit changes to the new branch
      for (const fileChange of fileChanges) {
        await this.updateFile(
          repoFullName,
          branchName,
          fileChange.path,
          fileChange.content,
          accessToken
        );
      }

      // Step 5: Create pull request
      const prTitle = `🔒 Security Fixes: ${vulnerabilities.length} vulnerabilities addressed`;
      const prBody = this.generatePRDescription(vulnerabilities);

      const prResponse = await axios.post(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/pulls`,
        {
          title: prTitle,
          head: branchName,
          base: defaultBranch,
          body: prBody,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return {
        prUrl: prResponse.data.html_url,
        prNumber: prResponse.data.number,
      };
    } catch (error: any) {
      console.error('Error creating PR:', error.response?.data || error.message);
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  /**
   * Prepare file changes by applying patches
   */
  private static async prepareFileChanges(
    repoFullName: string,
    branch: string,
    vulnerabilities: IVulnerability[],
    accessToken: string
  ): Promise<FileChange[]> {
    const fileChanges: Map<string, string> = new Map();

    // Group vulnerabilities by file
    const vulnsByFile = new Map<string, IVulnerability[]>();
    for (const vuln of vulnerabilities) {
      if (!vuln.fixAvailable) continue;
      
      if (!vulnsByFile.has(vuln.file)) {
        vulnsByFile.set(vuln.file, []);
      }
      vulnsByFile.get(vuln.file)!.push(vuln);
    }

    // Process each file
    for (const [filePath, vulns] of vulnsByFile.entries()) {
      try {
        // Get current file content
        const fileResponse = await axios.get(
          `${this.GITHUB_API_URL}/repos/${repoFullName}/contents/${filePath}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        let content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');

        // Apply fixes for this file (sort by line number descending to avoid offset issues)
        const sortedVulns = vulns.sort((a, b) => b.line - a.line);
        
        for (const vuln of sortedVulns) {
          content = this.applyFix(content, vuln);
        }

        fileChanges.set(filePath, content);
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        // Continue with other files
      }
    }

    return Array.from(fileChanges.entries()).map(([path, content]) => ({
      path,
      content,
    }));
  }

  /**
   * Apply a single fix to file content
   */
  private static applyFix(content: string, vuln: IVulnerability): string {
    // Simple replacement strategy
    // In production, you might want more sophisticated patching
    const lines = content.split('\n');
    
    // Try to find and replace the vulnerable code
    const originalCode = vuln.originalCode.trim();
    const patchedCode = vuln.patchedCode.trim();

    // Replace the vulnerable code with patched code
    const updatedContent = content.replace(originalCode, patchedCode);
    
    return updatedContent;
  }

  /**
   * Update a file in the repository
   */
  private static async updateFile(
    repoFullName: string,
    branch: string,
    filePath: string,
    content: string,
    accessToken: string
  ): Promise<void> {
    try {
      // Get current file SHA
      const fileResponse = await axios.get(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/contents/${filePath}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const fileSha = fileResponse.data.sha;

      // Update file
      await axios.put(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/contents/${filePath}`,
        {
          message: `fix: Security fix for ${filePath}`,
          content: Buffer.from(content).toString('base64'),
          sha: fileSha,
          branch: branch,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    } catch (error: any) {
      console.error(`Error updating file ${filePath}:`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate PR description
   */
  private static generatePRDescription(vulnerabilities: IVulnerability[]): string {
    const summary = {
      critical: vulnerabilities.filter(v => v.severity === 'critical').length,
      high: vulnerabilities.filter(v => v.severity === 'high').length,
      medium: vulnerabilities.filter(v => v.severity === 'medium').length,
      low: vulnerabilities.filter(v => v.severity === 'low').length,
    };

    let description = `## 🔒 Automated Security Fixes\n\n`;
    description += `This PR addresses **${vulnerabilities.length} security vulnerabilities** detected by VulnixAI.\n\n`;
    
    description += `### Summary\n\n`;
    if (summary.critical > 0) description += `- 🔴 **${summary.critical}** Critical\n`;
    if (summary.high > 0) description += `- 🟠 **${summary.high}** High\n`;
    if (summary.medium > 0) description += `- 🟡 **${summary.medium}** Medium\n`;
    if (summary.low > 0) description += `- 🟢 **${summary.low}** Low\n`;
    
    description += `\n### Vulnerabilities Fixed\n\n`;

    // Group by file
    const byFile = new Map<string, IVulnerability[]>();
    for (const vuln of vulnerabilities) {
      if (!vuln.fixAvailable) continue;
      if (!byFile.has(vuln.file)) {
        byFile.set(vuln.file, []);
      }
      byFile.get(vuln.file)!.push(vuln);
    }

    for (const [file, vulns] of byFile.entries()) {
      description += `#### 📄 \`${file}\`\n\n`;
      for (const vuln of vulns) {
        const emoji = vuln.severity === 'critical' ? '🔴' : 
                     vuln.severity === 'high' ? '🟠' : 
                     vuln.severity === 'medium' ? '🟡' : '🟢';
        description += `- ${emoji} **${vuln.title}** (Line ${vuln.line})\n`;
        description += `  - ${vuln.description}\n`;
        description += `  - CWE: ${vuln.cweId}\n\n`;
      }
    }

    description += `\n### ⚠️ Important\n\n`;
    description += `- Please review all changes carefully before merging\n`;
    description += `- Test the application thoroughly after merging\n`;
    description += `- These fixes were generated by AI and may need adjustments\n\n`;
    
    description += `---\n`;
    description += `🤖 Generated by [VulnixAI](https://github.com/vulnixai) - AI-Powered Security Scanner\n`;

    return description;
  }

  /**
   * Add labels to PR
   */
  static async addLabels(
    repoFullName: string,
    prNumber: number,
    accessToken: string
  ): Promise<void> {
    try {
      await axios.post(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/issues/${prNumber}/labels`,
        {
          labels: ['security', 'automated', 'vulnixai'],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    } catch (error) {
      // Labels might not exist, that's okay
      console.log('Could not add labels (this is normal if labels don\'t exist)');
    }
  }
}
