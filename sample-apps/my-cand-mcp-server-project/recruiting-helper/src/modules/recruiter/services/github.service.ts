import axios from 'axios';
import { RawCandidateData } from '../models/candidate.js';

export class GithubService {
  /**
   * Fetches data from GitHub public API (profile information only, no repository scraping)
   */
  async fetchProfile(username: string): Promise<RawCandidateData | null> {
    try {
      const response = await axios.get(`https://api.github.com/users/${username}`, {
        headers: {
          'User-Agent': 'NitroStack-Recruiting-Helper'
        },
        timeout: 10000
      });

      const data = response.data;
      
      return {
        source: 'github',
        tier: 'B',
        name: data.name || data.login,
        email: data.email,
        location: data.location,
        bio: data.bio,
        projects: [], // Disabled repository scraping as requested
        links: [data.html_url, data.blog].filter(Boolean) as string[],
      };
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn(`GitHub user ${username} not found.`);
        return null;
      }
      console.error(`Error fetching GitHub profile for ${username}:`, error.message);
      return null;
    }
  }
}
