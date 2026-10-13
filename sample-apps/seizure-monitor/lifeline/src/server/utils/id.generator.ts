/**
 * Utility for generating unique IDs and confirmation codes
 */
export class IdGenerator {
  /**
   * Generates a prefixed unique ID, e.g. "res_8f3a1b2c"
   */
  public static generateId(prefix = 'id'): string {
    const randomHex = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${randomHex}`;
  }

  /**
   * Generates a human-readable 6-character alphanumeric confirmation code for emergency bed reservations
   */
  public static generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes ambiguous characters (0, O, 1, I)
    let code = 'EMG-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
