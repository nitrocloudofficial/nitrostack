import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';
import { UserRepository } from '../../data/repositories/user-repository.js';
import path from 'path';
import fs from 'fs';

/**
 * Profile Resources
 */
export class profileResources {
  
  private userRepo = new UserRepository();

  @Resource({
    uri: 'profile://{userId}',
    name: 'User Profile',
    description: 'Read this resource to understand the user\'s medical conditions, allergies, diet plan, and taste preferences. Crucial for any nutritional planning.',
    mimeType: 'application/json',
  })
  async getProfile(context: ExecutionContext) {
    const uri = String(context.metadata?.uri || '');
    const userId = uri.split('://')[1];

    if (!userId) {
      throw new Error("Missing userId in URI");
    }

    const user = this.userRepo.getById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const profilePath = path.join(process.cwd(), 'data', 'users', userId, 'profile.json');
    const stat = fs.existsSync(profilePath) ? fs.statSync(profilePath) : null;

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(user, null, 2)
      }],
      annotations: {
        audience: ['any'],
        priority: 1
      },
      lastModified: stat ? stat.mtimeMs : undefined
    };
  }
}

