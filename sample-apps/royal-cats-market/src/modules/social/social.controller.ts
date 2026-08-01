import { ControllerDecorator as Controller, ToolDecorator as Tool, Widget, ExecutionContext, z, Injectable } from '@nitrostack/core';
import { SocialService, globalSocialService } from './social.service.js';

@Injectable()
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) { }

  @Tool({
    name: 'facebook_post',
    description: 'Create a post on the connected Facebook Page.',
    inputSchema: z.object({
      message: z.string().describe('The message content of the post.'),
      link: z.string().optional().describe('An optional URL link to attach to the post.')
    })
  })
  async facebookPost(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalSocialService.postToFacebook(input.message, input.link);
      return { success: true, result };
    } catch (error: any) {
      ctx.logger.error('Facebook post failed: ' + error.message);
      return { error: 'Failed to create Facebook post', details: error.message };
    }
  }

  @Tool({
    name: 'facebook_analytics',
    description: 'Get insights and analytics for the connected Facebook Page.',
    inputSchema: z.object({})
  })
  async facebookAnalytics(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalSocialService.getFacebookAnalytics();
      return { success: true, data: result };
    } catch (error: any) {
      ctx.logger.error('Facebook analytics failed: ' + error.message);
      return { error: 'Failed to fetch Facebook analytics', details: error.message };
    }
  }

  @Tool({
    name: 'instagram_post',
    description: 'Publish an image post to the connected Instagram account.',
    inputSchema: z.object({
      image_url: z.string().describe('The URL of the image to post.'),
      caption: z.string().optional().describe('Optional caption for the Instagram post.')
    })
  })
  async instagramPost(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalSocialService.postToInstagram(input.image_url, input.caption);
      return { success: true, result };
    } catch (error: any) {
      ctx.logger.error('Instagram post failed: ' + error.message);
      return { error: 'Failed to create Instagram post', details: error.message };
    }
  }

  @Tool({
    name: 'instagram_analytics',
    description: 'Get insights and analytics for the connected Instagram account.',
    inputSchema: z.object({})
  })
  async instagramAnalytics(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalSocialService.getInstagramAnalytics();
      return { success: true, data: result };
    } catch (error: any) {
      ctx.logger.error('Instagram analytics failed: ' + error.message);
      return { error: 'Failed to fetch Instagram analytics', details: error.message };
    }
  }

  @Tool({
    name: 'linkedin_post',
    description: 'Publish a text or link post to LinkedIn.',
    inputSchema: z.object({
      text: z.string().describe('The text content of the LinkedIn post.')
    })
  })
  async linkedinPost(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalSocialService.postToLinkedIn(input.text);
      return { success: true, result };
    } catch (error: any) {
      ctx.logger.error('LinkedIn post failed: ' + error.message);
      return { error: 'Failed to create LinkedIn post', details: error.message };
    }
  }

  @Tool({
    name: 'linkedin_analytics',
    description: 'Get basic profile analytics/insights for LinkedIn.',
    inputSchema: z.object({})
  })
  async linkedinAnalytics(input: any, ctx: ExecutionContext) {
    try {
      const result = await globalSocialService.getLinkedInAnalytics();
      return { success: true, data: result };
    } catch (error: any) {
      ctx.logger.error('LinkedIn analytics failed: ' + error.message);
      return { error: 'Failed to fetch LinkedIn analytics', details: error.message };
    }
  }

  @Tool({
    name: 'list_posts',
    description: 'Lists all available social media posts from integrated platforms.',
    inputSchema: z.object({})
  })
  async listPosts(input: any, ctx: ExecutionContext) {
    const posts: any[] = [];
    const FB_PAGE_ID = (process.env.FB_PAGE_ID || '').replace(/['"]+/g, '').trim();
    const IG_USER_ID = (process.env.IG_USER_ID || '').replace(/['"]+/g, '').trim();
    const FB_API_VERSION = (process.env.FB_BASE_URL ? process.env.FB_BASE_URL.split('/').pop() : 'v21.0');
    const PAGE_ACCESS_TOKEN = (process.env.FB_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN || '').replace(/['"]+/g, '').trim();

    if (FB_PAGE_ID && PAGE_ACCESS_TOKEN) {
      try {
        const url = `https://graph.facebook.com/${FB_API_VERSION}/${FB_PAGE_ID}/published_posts?fields=id,message,created_time,likes.summary(true),comments.summary(true)&access_token=${PAGE_ACCESS_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json() as any;
        if (data.data) {
          data.data.forEach((p: any) => {
            posts.push({
              id: p.id,
              title: p.message ? p.message.slice(0, 30) + '...' : 'Facebook Post',
              date: p.created_time ? p.created_time.split('T')[0] : '',
              likes: p.likes?.summary?.total_count || 0,
              comments: p.comments?.summary?.total_count || 0,
              platforms: ['Facebook']
            });
          });
        }
      } catch (e) {
        ctx.logger.error('Failed to fetch FB posts: ' + (e as Error).message);
      }
    }

    if (IG_USER_ID && PAGE_ACCESS_TOKEN) {
      try {
        const url = `https://graph.facebook.com/${FB_API_VERSION}/${IG_USER_ID}/media?fields=id,caption,timestamp,like_count,comments_count&access_token=${PAGE_ACCESS_TOKEN}`;
        const res = await fetch(url);
        const data = await res.json() as any;
        if (data.data) {
          data.data.forEach((p: any) => {
            posts.push({
              id: p.id,
              title: p.caption ? p.caption.slice(0, 30) + '...' : 'Instagram Post',
              date: p.timestamp ? p.timestamp.split('T')[0] : '',
              likes: p.like_count || 0,
              comments: p.comments_count || 0,
              platforms: ['Instagram']
            });
          });
        }
      } catch (e) {
        ctx.logger.error('Failed to fetch IG posts: ' + (e as Error).message);
      }
    }

    return { posts };
  }
}
