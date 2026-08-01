import { Injectable } from '@nitrostack/core';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service.js';
import { UserModel, type UserDocument } from './schemas/user.schema.js';

@Injectable({ deps: [DatabaseService] })
export class AuthService {
  constructor(private db: DatabaseService) {}

  // A basic salt + hash approach for demonstration purposes
  private hashPassword(password: string): string {
    // In a real production app, use bcrypt or argon2!
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async registerUser(username: string, passwordPlain: string, role: 'admin' | 'user' = 'user'): Promise<UserDocument> {
    if (!this.db.isConnected()) {
      throw new Error('Database is not connected. Cannot register user.');
    }

    const passwordHash = this.hashPassword(passwordPlain);
    
    // Check if user already exists
    const existing = await UserModel.findOne({ username });
    if (existing) {
      throw new Error(`Username ${username} is already taken.`);
    }

    const user = await UserModel.create({
      username,
      passwordHash,
      role
    });

    return user;
  }

  async authenticate(username: string, passwordPlain: string): Promise<UserDocument | null> {
    if (!this.db.isConnected()) {
      throw new Error('Database is not connected.');
    }

    const user = await UserModel.findOne({ username });
    if (!user) {
      return null;
    }

    const hash = this.hashPassword(passwordPlain);
    if (user.passwordHash !== hash) {
      return null;
    }

    return user;
  }
}
