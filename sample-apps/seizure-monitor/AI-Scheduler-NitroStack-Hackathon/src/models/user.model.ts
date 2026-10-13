export interface UserDocument {
  googleId?: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: {
    workingHoursStart?: string;
    workingHoursEnd?: string;
    timezone?: string;
  };
  mcpConfigurations?: Record<string, unknown>;
  createdAt: Date;
}

export class UserModel {
  static create(user: Partial<UserDocument>) {
    return {
      ...user,
      createdAt: user.createdAt ?? new Date()
    };
  }
}
