import dotenv from 'dotenv';
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  APP_NAME: process.env.APP_NAME || 'Converra_One',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  
  NITROSTACK: {
    API_KEY: process.env.NITROSTACK_API_KEY || '',
    PROJECT_ID: process.env.NITROSTACK_PROJECT_ID || 'converra_one',
    SERVER_NAME: process.env.NITROSTACK_SERVER_NAME || 'converra-one-mcp'
  },
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
    MODEL: process.env.OPENAI_MODEL || 'gpt-4o'
  },
  SUPABASE: {
    URL: process.env.SUPABASE_URL || '',
    ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || ''
  },
  SLACK: {
    BOT_TOKEN: process.env.SLACK_BOT_TOKEN || '',
    SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || ''
  },
  DISCORD: {
    BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || '',
    CLIENT_ID: process.env.DISCORD_CLIENT_ID || ''
  },
  GITHUB: {
    PAT: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '',
    CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || ''
  },
  NOTION: {
    API_KEY: process.env.NOTION_API_KEY || '',
    DATABASE_ID: process.env.NOTION_DATABASE_ID || ''
  }
};
