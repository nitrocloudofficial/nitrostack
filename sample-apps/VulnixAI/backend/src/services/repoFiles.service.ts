import axios from 'axios';

export interface RepoFile {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export class RepoFilesService {
  private static readonly GITHUB_API_URL = 'https://api.github.com';

  /**
   * Get file content from repository
   */
  static async getFileContent(
    repoFullName: string,
    filePath: string,
    branch: string,
    accessToken: string
  ): Promise<RepoFile> {
    try {
      const response = await axios.get(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/contents/${filePath}?ref=${branch}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');

      return {
        path: response.data.path,
        content,
        sha: response.data.sha,
        size: response.data.size,
      };
    } catch (error: any) {
      console.error(`Error fetching file ${filePath}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }

  /**
   * Update file content in repository
   */
  static async updateFileContent(
    repoFullName: string,
    filePath: string,
    content: string,
    sha: string,
    branch: string,
    commitMessage: string,
    accessToken: string
  ): Promise<void> {
    try {
      await axios.put(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/contents/${filePath}`,
        {
          message: commitMessage,
          content: Buffer.from(content).toString('base64'),
          sha,
          branch,
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
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  /**
   * Get repository tree (file structure)
   */
  static async getRepoTree(
    repoFullName: string,
    branch: string,
    accessToken: string
  ): Promise<Array<{ path: string; type: string; sha: string }>> {
    try {
      const response = await axios.get(
        `${this.GITHUB_API_URL}/repos/${repoFullName}/git/trees/${branch}?recursive=1`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return response.data.tree.filter((item: any) => item.type === 'blob');
    } catch (error: any) {
      console.error('Error fetching repo tree:', error.response?.data || error.message);
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }
}
