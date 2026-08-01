export interface UserPreferences {
  preferredReplyTone: string;
  reminderTimingMin: number;
  digestFrequency: 'realtime' | 'hourly' | 'daily';
  priorityThreshold: number;
  theme: 'dark' | 'light' | 'system';
  defaultPage: string;
}

export class UserPreferencesService {
  private static instance: UserPreferencesService;
  private prefs: UserPreferences;

  constructor() {
    this.prefs = {
      preferredReplyTone: 'Professional',
      reminderTimingMin: 15,
      digestFrequency: 'hourly',
      priorityThreshold: 0.70,
      theme: 'dark',
      defaultPage: 'dashboard'
    };
  }

  public static getInstance(): UserPreferencesService {
    if (!UserPreferencesService.instance) {
      UserPreferencesService.instance = new UserPreferencesService();
    }
    return UserPreferencesService.instance;
  }

  public getPreferences(): UserPreferences {
    return { ...this.prefs };
  }

  public updatePreferences(newPrefs: Partial<UserPreferences>): void {
    this.prefs = { ...this.prefs, ...newPrefs };
  }
}
