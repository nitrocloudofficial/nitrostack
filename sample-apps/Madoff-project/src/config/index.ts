import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-pro'),
  CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.8),
  TIMEOUT: z.coerce.number().default(5000),
  CACHE_DURATION: z.coerce.number().default(60000),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/madoff'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.2-11b-vision-preview'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const config = {
  gemini: {
    apiKey: parsedEnv.data.GEMINI_API_KEY,
    model: parsedEnv.data.GEMINI_MODEL,
  },
  groq: {
    apiKey: parsedEnv.data.GROQ_API_KEY,
    model: parsedEnv.data.GROQ_MODEL,
  },
  app: {
    confidenceThreshold: parsedEnv.data.CONFIDENCE_THRESHOLD,
    timeout: parsedEnv.data.TIMEOUT,
    cacheDuration: parsedEnv.data.CACHE_DURATION,
  },
  mongo: {
    uri: parsedEnv.data.MONGODB_URI,
  },
  cloudinary: {
    cloudName: parsedEnv.data.CLOUDINARY_CLOUD_NAME,
    apiKey: parsedEnv.data.CLOUDINARY_API_KEY,
    apiSecret: parsedEnv.data.CLOUDINARY_API_SECRET,
  }
};
