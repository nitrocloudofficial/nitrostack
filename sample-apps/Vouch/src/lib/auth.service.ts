import { Injectable, ConfigService } from '@nitrostack/core';
import { DatabaseService } from './database.service.js';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: 'consumer' | 'business' | 'moderator' | 'admin';
  email_verified: boolean;
  verification_token?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * Authentication Service
 * Handles user signup, login, verification, and JWT token management.
 */
@Injectable({ deps: [DatabaseService, ConfigService] })
export class AuthService {
  private jwtSecret: string;
  private jwtExpiry: string = '24h';

  constructor(
    private db: DatabaseService,
    private config: ConfigService
  ) {
    this.jwtSecret = this.config.get('JWT_SECRET') || 'dev-secret-key-change-in-production';
  }

  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compare a password with its hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token
   */
  generateToken(userId: string, email: string, role: string): AuthToken {
    const accessToken = jwt.sign(
      { userId, email, role },
      this.jwtSecret,
      { expiresIn: this.jwtExpiry } as jwt.SignOptions
    );

    return {
      accessToken,
      expiresIn: 86400, // 24 hours in seconds
    };
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret) as any;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a verification token
   */
  generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Sign up a new user
   */
  async signup(email: string, password: string, role: string = 'consumer'): Promise<User> {
    // Check if user already exists
    const existing = await this.db.queryOne<User>(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);
    const verificationToken = this.generateVerificationToken();
    const userId = `user_${randomBytes(8).toString('hex')}`;

    // Insert user
    const result = await this.db.queryOne<User>(
      `INSERT INTO users (id, email, password_hash, role, email_verified, verification_token, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, password_hash, role, email_verified, verification_token, created_at, updated_at`,
      [userId, email, passwordHash, role, false, verificationToken]
    );

    if (!result) {
      throw new Error('Failed to create user');
    }

    return result;
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string, verificationToken: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE users SET email_verified = true, verification_token = NULL, updated_at = NOW()
       WHERE id = $1 AND verification_token = $2`,
      [userId, verificationToken]
    );

    return result.rowCount! > 0;
  }

  /**
   * Login user
   */
  async login(email: string, password: string): Promise<{ user: User; token: AuthToken }> {
    // Find user by email
    const user = await this.db.queryOne<User>(
      'SELECT id, email, password_hash, role, email_verified, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = await this.comparePassword(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = this.generateToken(user.id, user.email, user.role);

    return { user, token };
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.db.queryOne<User>(
      'SELECT id, email, password_hash, role, email_verified, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    return this.db.queryOne<User>(
      'SELECT id, email, password_hash, role, email_verified, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
  }
}
