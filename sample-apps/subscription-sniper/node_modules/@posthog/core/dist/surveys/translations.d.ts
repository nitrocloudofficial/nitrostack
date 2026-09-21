import type { Logger, SurveyQuestionTranslation, SurveyTranslation } from '../types';
export type DetectSurveyLanguageOptions = {
    overrideLanguage?: unknown;
    storedPersonProperties?: unknown;
    locale?: unknown;
};
export declare function getLanguageFromStoredPersonProperties(storedPersonProperties: unknown): string | null;
export declare function detectSurveyLanguage({ overrideLanguage, storedPersonProperties, locale }: DetectSurveyLanguageOptions, logger?: Logger): string | null;
export declare function normalizeLanguageCode(languageCode: string): string;
export declare function getBaseLanguage(languageCode: string): string;
export declare function findBestTranslationMatch(translations: Record<string, unknown> | undefined, targetLanguage: string, logger?: Logger): string | null;
type TranslatableSurveyAppearance = {
    thankYouMessageHeader?: string;
    thankYouMessageDescription?: string | null;
    thankYouMessageCloseButtonText?: string;
    submitButtonText?: string;
    backButtonText?: string;
};
type TranslatableSurveyQuestion = {
    question: string;
    description?: string | null;
    buttonText?: string;
    link?: string | null;
    lowerBoundLabel?: string;
    upperBoundLabel?: string;
    choices?: string[];
    translations?: Record<string, SurveyQuestionTranslation>;
};
type TranslatableSurvey<TQuestion extends TranslatableSurveyQuestion = TranslatableSurveyQuestion> = {
    name: string;
    translations?: Record<string, SurveyTranslation>;
    appearance?: TranslatableSurveyAppearance | null;
    questions: TQuestion[];
};
export declare function applySurveyTranslation<TQuestion extends TranslatableSurveyQuestion, TSurvey extends TranslatableSurvey<TQuestion>>(survey: TSurvey, targetLanguage: string, logger?: Logger): {
    survey: TSurvey;
    matchedKey: string | null;
};
export {};
//# sourceMappingURL=translations.d.ts.map