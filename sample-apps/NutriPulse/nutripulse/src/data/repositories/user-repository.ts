import path from 'path';
import fs from 'fs';
import { JsonRepository } from './repository.js';
import { UserProfile, UserProfileSchema } from '../../domain/types.js';

const USERS_DIR = path.resolve(process.cwd(), 'data', 'users');

export class UserRepository extends JsonRepository<UserProfile> {
  constructor() {
    // We pass a dummy path here because we override load() to read multiple files
    super(USERS_DIR, UserProfileSchema, (data) => data);
  }

  public load(): void {
    if (this.initialized) return;

    if (!fs.existsSync(USERS_DIR)) {
      throw new Error(`[UserRepository] Users directory not found at ${USERS_DIR}`);
    }

    const directories = fs.readdirSync(USERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const userId of directories) {
      const profilePath = path.join(USERS_DIR, userId, 'profile.json');
      if (fs.existsSync(profilePath)) {
        const rawData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
        const validUser = this.schema.parse(rawData);
        this.items.set(validUser.id, validUser);
      }
    }

    this.initialized = true;
  }
}
