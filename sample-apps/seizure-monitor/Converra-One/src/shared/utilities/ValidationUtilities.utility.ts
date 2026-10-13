export class ValidationUtilities {
  public static isValidEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  public static isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  public static isPositiveNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && value > 0;
  }
}
