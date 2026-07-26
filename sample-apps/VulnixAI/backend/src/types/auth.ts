export interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  bio: string | null;
  company: string | null;
  location: string | null;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: number;
    username: string;
    name: string;
    email: string;
    avatar: string;
  };
  error?: string;
}
