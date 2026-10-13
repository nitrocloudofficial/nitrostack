import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export const userProfileStore = new Map<string, { skinType: number }>();

export class VayuResources {
  @Resource({
    uri: 'vayu://profile',
    name: 'User Profile',
    description: 'Reads the user profile, including Fitzpatrick skin type (1-6).',
    mimeType: 'application/json'
  })
  async getProfile(uri: string, ctx: ExecutionContext) {
    ctx.logger.info('Fetching user profile');
    
    // For this prototype, we'll use a static ID to demonstrate the read/write loop.
    // In a production app, you would parse the ID out of a dynamic URI.
    const profile = userProfileStore.get("tester") || { skinType: 3 };

    // MCP resources must return this exact contents array structure
    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(profile)
      }]
    };
  }
}