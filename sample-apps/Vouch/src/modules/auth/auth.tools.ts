import { ToolDecorator as Tool, z, ExecutionContext, Injectable } from '@nitrostack/core';
import { AuthService } from '../../lib/auth.service.js';
import { DatabaseService } from '../../lib/database.service.js';

/**
 * Auth Tools
 * Provides signup, login, and email verification endpoints.
 */
@Injectable({ deps: [AuthService, DatabaseService] })
export class AuthTools {
  constructor(
    private authService: AuthService,
    private db: DatabaseService
  ) {}



  @Tool({
    name: 'auth_signup',
    description: 'Register a new user account',
    inputSchema: z.object({
      email: z.string().email().describe('User email address'),
      password: z.string().min(8).describe('Password (minimum 8 characters)'),
      role: z.enum(['consumer', 'business']).default('consumer').describe('Account role'),
    }),
  })
  async signup(
    input: { email: string; password: string; role?: string },
    context: ExecutionContext
  ) {
    try {
      const user = await this.authService.signup(input.email, input.password, input.role || 'consumer');

      // Create default reputation record for new users
      await this.db.query(
        `INSERT INTO reviewer_reputation (user_id, reputation_points, badge_tier)
         VALUES ($1, 0, 'new_reviewer')
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id]
      );

      const token = this.authService.generateToken(user.id, user.email, user.role);

      context.logger.info(`User signed up: ${user.email}`);

      return {
        success: true,
        userId: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        verificationToken: (user as any).verification_token,
        token: token.accessToken,
        expiresIn: token.expiresIn,
        message: 'Account created successfully. Please verify your email.',
      };
    } catch (error: any) {
      context.logger.error(`Signup failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: 'SIGNUP_ERROR',
      };
    }
  }

  @Tool({
    name: 'auth_login',
    description: 'Login with email and password',
    inputSchema: z.object({
      email: z.string().email().describe('User email address'),
      password: z.string().describe('User password'),
    }),
  })
  async login(
    input: { email: string; password: string },
    context: ExecutionContext
  ) {
    try {
      const { user, token } = await this.authService.login(input.email, input.password);

      // Update last login timestamp
      await this.db.query(
        `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [user.id]
      );

      context.logger.info(`User logged in: ${user.email}`);

      return {
        success: true,
        userId: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        token: token.accessToken,
        expiresIn: token.expiresIn,
      };
    } catch (error: any) {
      context.logger.error(`Login failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: 'LOGIN_ERROR',
      };
    }
  }

  @Tool({
    name: 'auth_verify_email',
    description: 'Verify user email address with a verification token',
    inputSchema: z.object({
      user_id: z.string().describe('User ID'),
      verification_token: z.string().describe('Email verification token'),
    }),
  })
  async verifyEmail(
    input: { user_id: string; verification_token: string },
    context: ExecutionContext
  ) {
    try {
      const verified = await this.authService.verifyEmail(input.user_id, input.verification_token);

      if (!verified) {
        return {
          success: false,
          error: 'Invalid or expired verification token',
          code: 'INVALID_TOKEN',
        };
      }

      // Award points for verifying email
      await this.db.query(
        `UPDATE reviewer_reputation SET reputation_points = reputation_points + 10 WHERE user_id = $1`,
        [input.user_id]
      );

      context.logger.info(`Email verified for user: ${input.user_id}`);

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error: any) {
      context.logger.error(`Email verification failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: 'VERIFICATION_ERROR',
      };
    }
  }

  @Tool({
    name: 'auth_verify_token',
    description: 'Verify a JWT token and return the decoded payload',
    inputSchema: z.object({
      token: z.string().describe('JWT access token'),
    }),
  })
  async verifyToken(
    input: { token: string },
    context: ExecutionContext
  ) {
    try {
      const decoded = this.authService.verifyToken(input.token);

      if (!decoded) {
        return {
          success: false,
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        };
      }

      return {
        success: true,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        issuedAt: decoded.iat,
        expiresAt: decoded.exp,
      };
    } catch (error: any) {
      context.logger.error(`Token verification failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: 'VERIFY_ERROR',
      };
    }
  }

  @Tool({
    name: 'auth_get_user',
    description: 'Get user information by ID',
    inputSchema: z.object({
      userId: z.string().describe('User ID'),
    }),
  })
  async getUser(
    input: { userId: string },
    context: ExecutionContext
  ) {
    try {
      const user = await this.authService.getUserById(input.userId);

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      return {
        success: true,
        userId: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      };
    } catch (error: any) {
      context.logger.error(`Get user failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
