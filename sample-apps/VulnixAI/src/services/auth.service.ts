import { API_ENDPOINTS } from '../config/api';

export interface User {
  userId: number;
  username: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  bio?: string;
  company?: string;
  location?: string;
  firstLogin?: string;
  lastLogin?: string;
  lastActive?: string;
  loginCount?: number;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';

  static async initiateGitHubLogin(): Promise<void> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.github);
      const data = await response.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error initiating GitHub login:', error);
      throw error;
    }
  }

  static saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static async verifyToken(): Promise<User | null> {
    const token = this.getToken();
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(API_ENDPOINTS.auth.verify, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        this.removeToken();
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error('Error verifying token:', error);
      this.removeToken();
      return null;
    }
  }

  static async logout(): Promise<void> {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(API_ENDPOINTS.auth.logout, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error during logout:', error);
      }
    }

    this.removeToken();
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
