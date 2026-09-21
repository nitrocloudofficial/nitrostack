import { SurveyValidationRule, SurveyValidationType } from '../types';
/**
 * Validates a survey open text response.
 * Returns an error message string if invalid, or false if valid.
 */
export declare function getValidationError(value: string, rules: SurveyValidationRule[] | undefined, optional: boolean | undefined): string | false;
/**
 * Helper to extract a length value from validation rules by type
 */
export declare function getLengthFromRules(rules: SurveyValidationRule[] | undefined, type: SurveyValidationType): number | undefined;
/**
 * Builds a requirements hint message for display to the user.
 * Returns undefined if no hint should be shown.
 *
 * min=1 is always hidden because:
 * - Required questions: min=1 is redundant (required already means "enter something")
 * - Optional questions: min=1 is useless (user can skip, or if they type anything it's ≥1 char)
 */
export declare function getRequirementsHint(minLength: number | undefined, maxLength: number | undefined): string | undefined;
//# sourceMappingURL=validation.d.ts.map