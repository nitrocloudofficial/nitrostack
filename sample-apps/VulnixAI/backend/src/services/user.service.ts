import { User, IUser } from '../db/models/User.model.js';
import type { GitHubUser } from '../types/auth.js';

export class UserService {
  /**
   * Create or update user on login
   */
  static async createOrUpdateUser(githubUser: GitHubUser, accessToken?: string): Promise<IUser> {
    try {
      const existingUser = await User.findOne({ githubId: githubUser.id });

      if (existingUser) {
        // Update existing user
        existingUser.username = githubUser.login;
        existingUser.email = githubUser.email;
        existingUser.name = githubUser.name;
        existingUser.avatarUrl = githubUser.avatar_url;
        existingUser.bio = githubUser.bio || undefined;
        existingUser.company = githubUser.company || undefined;
        existingUser.location = githubUser.location || undefined;
        existingUser.lastLogin = new Date();
        existingUser.lastActive = new Date();
        existingUser.loginCount += 1;

        if (accessToken) {
          (existingUser as any).githubAccessToken = accessToken;
        }

        await existingUser.save();
        return existingUser;
      } else {
        // Create new user
        const newUser = new User({
          githubId: githubUser.id,
          username: githubUser.login,
          email: githubUser.email,
          name: githubUser.name,
          avatarUrl: githubUser.avatar_url,
          bio: githubUser.bio,
          company: githubUser.company,
          location: githubUser.location,
          firstLogin: new Date(),
          lastLogin: new Date(),
          lastActive: new Date(),
          loginCount: 1,
          extra: {},
          ...(accessToken && { githubAccessToken: accessToken }),
        });

        await newUser.save();
        return newUser;
      }
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to save user data');
    }
  }

  /**
   * Update user's last active time
   */
  static async updateLastActive(userId: number): Promise<void> {
    try {
      await User.findOneAndUpdate(
        { githubId: userId },
        { lastActive: new Date() }
      );
    } catch (error) {
      console.error('Error updating last active:', error);
    }
  }

  /**
   * Get user by GitHub ID
   */
  static async getUserByGithubId(githubId: number): Promise<IUser | null> {
    try {
      if (githubId === 99999) {
        return {
          githubId: 99999,
          username: 'mock_developer',
          email: 'developer@vulnix.local',
          name: 'Mock Developer',
          avatarUrl: 'https://github.com/identicons/mock_developer.png',
          bio: 'Offline Local Development Profile',
          loginCount: 1,
          firstLogin: new Date(),
          lastLogin: new Date(),
          lastActive: new Date(),
        } as any;
      }
      return await User.findOne({ githubId });
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Get user's GitHub access token
   */
  static async getGithubAccessToken(githubId: number): Promise<string | null> {
    try {
      if (githubId === 99999) {
        return 'mock-access-token';
      }
      const user = await User.findOne({ githubId }).select('+githubAccessToken');
      return user?.githubAccessToken || null;
    } catch (error) {
      console.error('Error fetching access token:', error);
      return null;
    }
  }

  /**
   * Get user by username
   */
  static async getUserByUsername(username: string): Promise<IUser | null> {
    try {
      return await User.findOne({ username });
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Update user extra data
   */
  static async updateUserExtra(
    githubId: number,
    extraData: Record<string, any>
  ): Promise<IUser | null> {
    try {
      return await User.findOneAndUpdate(
        { githubId },
        { $set: { extra: extraData } },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating user extra data:', error);
      return null;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  static async getAllUsers(limit = 100): Promise<IUser[]> {
    try {
      return await User.find()
        .sort({ lastActive: -1 })
        .limit(limit);
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  }
}
