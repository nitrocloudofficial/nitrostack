import { isArray, isUndefined } from "../utils/index.mjs";
function getTrimmedLanguage(value) {
    return 'string' == typeof value && value.trim() ? value.trim() : null;
}
function getLanguageFromStoredPersonProperties(storedPersonProperties) {
    if (!storedPersonProperties || 'object' != typeof storedPersonProperties || !('language' in storedPersonProperties)) return null;
    return getTrimmedLanguage(storedPersonProperties.language);
}
function detectSurveyLanguage({ overrideLanguage, storedPersonProperties, locale }, logger) {
    const explicitLanguage = getTrimmedLanguage(overrideLanguage);
    if (explicitLanguage) {
        logger?.info(`Using override display language: ${explicitLanguage}`);
        return explicitLanguage;
    }
    const personLanguage = getLanguageFromStoredPersonProperties(storedPersonProperties);
    if (personLanguage) {
        logger?.info(`Using person property language: ${personLanguage}`);
        return personLanguage;
    }
    const detectedLocale = getTrimmedLanguage(locale);
    if (detectedLocale) {
        logger?.info(`Using detected locale: ${detectedLocale}`);
        return detectedLocale;
    }
    logger?.info('No user language detected');
    return null;
}
function normalizeLanguageCode(languageCode) {
    return languageCode.toLowerCase();
}
function getBaseLanguage(languageCode) {
    return languageCode.split('-')[0];
}
function findBestTranslationMatch(translations, targetLanguage, logger) {
    if (!translations || !targetLanguage) return null;
    const normalizedTarget = normalizeLanguageCode(targetLanguage);
    const exactMatch = Object.keys(translations).find((key)=>normalizeLanguageCode(key) === normalizedTarget);
    if (exactMatch) {
        logger?.debug(`Found exact translation match: ${exactMatch}`);
        return exactMatch;
    }
    if (normalizedTarget.includes('-')) {
        const baseLanguage = getBaseLanguage(normalizedTarget);
        const baseMatch = Object.keys(translations).find((key)=>normalizeLanguageCode(key) === baseLanguage);
        if (baseMatch) {
            logger?.debug(`Found base language translation match: ${baseMatch} (from ${targetLanguage})`);
            return baseMatch;
        }
    }
    return null;
}
function isTranslatedChoices(questionTranslation) {
    return isArray(questionTranslation.choices);
}
function hasAppearanceTranslation(translation) {
    return !isUndefined(translation.thankYouMessageHeader) || !isUndefined(translation.thankYouMessageDescription) || !isUndefined(translation.thankYouMessageCloseButtonText) || !isUndefined(translation.submitButtonText) || !isUndefined(translation.backButtonText);
}
function mergeQuestionTranslation(question, targetLanguage, logger) {
    const translationKey = findBestTranslationMatch(question.translations, targetLanguage, logger);
    if (!translationKey) return {
        question,
        matchedKey: null,
        hasChanges: false
    };
    const questionTranslation = question.translations?.[translationKey];
    if (!questionTranslation) return {
        question,
        matchedKey: null,
        hasChanges: false
    };
    const translated = {
        ...question
    };
    let hasChanges = false;
    if (!isUndefined(questionTranslation.question)) {
        translated.question = questionTranslation.question;
        hasChanges = true;
    }
    if (!isUndefined(questionTranslation.description)) {
        translated.description = questionTranslation.description;
        hasChanges = true;
    }
    if (!isUndefined(questionTranslation.buttonText)) {
        translated.buttonText = questionTranslation.buttonText;
        hasChanges = true;
    }
    if ('link' in translated && !isUndefined(questionTranslation.link)) {
        translated.link = questionTranslation.link;
        hasChanges = true;
    }
    if ('lowerBoundLabel' in translated && !isUndefined(questionTranslation.lowerBoundLabel)) {
        translated.lowerBoundLabel = questionTranslation.lowerBoundLabel;
        hasChanges = true;
    }
    if ('upperBoundLabel' in translated && !isUndefined(questionTranslation.upperBoundLabel)) {
        translated.upperBoundLabel = questionTranslation.upperBoundLabel;
        hasChanges = true;
    }
    if ('choices' in translated && isTranslatedChoices(questionTranslation)) {
        translated.choices = questionTranslation.choices;
        hasChanges = true;
    }
    return {
        question: hasChanges ? translated : question,
        matchedKey: hasChanges ? translationKey : null,
        hasChanges
    };
}
function applySurveyTranslation(survey, targetLanguage, logger) {
    const translationKey = findBestTranslationMatch(survey.translations, targetLanguage, logger);
    const translated = {
        ...survey
    };
    let hasTranslation = false;
    if (translationKey) {
        const translation = survey.translations?.[translationKey];
        if (translation) {
            logger?.info(`Applying survey-level translation for language: ${translationKey}`);
            if (!isUndefined(translation.name)) {
                translated.name = translation.name;
                hasTranslation = true;
            }
            if (translated.appearance) {
                translated.appearance = {
                    ...translated.appearance
                };
                if (!isUndefined(translation.thankYouMessageHeader)) {
                    translated.appearance.thankYouMessageHeader = translation.thankYouMessageHeader;
                    hasTranslation = true;
                }
                if (!isUndefined(translation.thankYouMessageDescription)) {
                    translated.appearance.thankYouMessageDescription = translation.thankYouMessageDescription;
                    hasTranslation = true;
                }
                if (!isUndefined(translation.thankYouMessageCloseButtonText)) {
                    translated.appearance.thankYouMessageCloseButtonText = translation.thankYouMessageCloseButtonText;
                    hasTranslation = true;
                }
                if (!isUndefined(translation.submitButtonText)) {
                    translated.appearance.submitButtonText = translation.submitButtonText;
                    hasTranslation = true;
                }
                if (!isUndefined(translation.backButtonText)) {
                    translated.appearance.backButtonText = translation.backButtonText;
                    hasTranslation = true;
                }
            } else if (hasAppearanceTranslation(translation)) hasTranslation = true;
        }
    }
    const translatedResults = survey.questions.map((question)=>mergeQuestionTranslation(question, targetLanguage, logger));
    const translatedQuestions = translatedResults.map((result)=>result.question);
    const anyQuestionTranslated = translatedResults.some((result)=>result.hasChanges);
    let questionMatchedKey = null;
    if (!translationKey) questionMatchedKey = translatedResults.find((result)=>result.matchedKey)?.matchedKey || null;
    if (anyQuestionTranslated) {
        translated.questions = translatedQuestions;
        hasTranslation = true;
        logger?.info(`Applied question-level translations for language: ${targetLanguage}`);
    }
    return {
        survey: translated,
        matchedKey: hasTranslation ? translationKey || questionMatchedKey : null
    };
}
export { applySurveyTranslation, detectSurveyLanguage, findBestTranslationMatch, getBaseLanguage, getLanguageFromStoredPersonProperties, normalizeLanguageCode };
