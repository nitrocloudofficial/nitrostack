"use strict";
var __webpack_require__ = {};
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
(()=>{
    __webpack_require__.r = (exports1)=>{
        if ('undefined' != typeof Symbol && Symbol.toStringTag) Object.defineProperty(exports1, Symbol.toStringTag, {
            value: 'Module'
        });
        Object.defineProperty(exports1, '__esModule', {
            value: true
        });
    };
})();
var __webpack_exports__ = {};
__webpack_require__.r(__webpack_exports__);
__webpack_require__.d(__webpack_exports__, {
    normalizeLanguageCode: ()=>normalizeLanguageCode,
    getBaseLanguage: ()=>getBaseLanguage,
    detectSurveyLanguage: ()=>detectSurveyLanguage,
    applySurveyTranslation: ()=>applySurveyTranslation,
    findBestTranslationMatch: ()=>findBestTranslationMatch,
    getLanguageFromStoredPersonProperties: ()=>getLanguageFromStoredPersonProperties
});
const index_js_namespaceObject = require("../utils/index.js");
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
    return (0, index_js_namespaceObject.isArray)(questionTranslation.choices);
}
function hasAppearanceTranslation(translation) {
    return !(0, index_js_namespaceObject.isUndefined)(translation.thankYouMessageHeader) || !(0, index_js_namespaceObject.isUndefined)(translation.thankYouMessageDescription) || !(0, index_js_namespaceObject.isUndefined)(translation.thankYouMessageCloseButtonText) || !(0, index_js_namespaceObject.isUndefined)(translation.submitButtonText) || !(0, index_js_namespaceObject.isUndefined)(translation.backButtonText);
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
    if (!(0, index_js_namespaceObject.isUndefined)(questionTranslation.question)) {
        translated.question = questionTranslation.question;
        hasChanges = true;
    }
    if (!(0, index_js_namespaceObject.isUndefined)(questionTranslation.description)) {
        translated.description = questionTranslation.description;
        hasChanges = true;
    }
    if (!(0, index_js_namespaceObject.isUndefined)(questionTranslation.buttonText)) {
        translated.buttonText = questionTranslation.buttonText;
        hasChanges = true;
    }
    if ('link' in translated && !(0, index_js_namespaceObject.isUndefined)(questionTranslation.link)) {
        translated.link = questionTranslation.link;
        hasChanges = true;
    }
    if ('lowerBoundLabel' in translated && !(0, index_js_namespaceObject.isUndefined)(questionTranslation.lowerBoundLabel)) {
        translated.lowerBoundLabel = questionTranslation.lowerBoundLabel;
        hasChanges = true;
    }
    if ('upperBoundLabel' in translated && !(0, index_js_namespaceObject.isUndefined)(questionTranslation.upperBoundLabel)) {
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
            if (!(0, index_js_namespaceObject.isUndefined)(translation.name)) {
                translated.name = translation.name;
                hasTranslation = true;
            }
            if (translated.appearance) {
                translated.appearance = {
                    ...translated.appearance
                };
                if (!(0, index_js_namespaceObject.isUndefined)(translation.thankYouMessageHeader)) {
                    translated.appearance.thankYouMessageHeader = translation.thankYouMessageHeader;
                    hasTranslation = true;
                }
                if (!(0, index_js_namespaceObject.isUndefined)(translation.thankYouMessageDescription)) {
                    translated.appearance.thankYouMessageDescription = translation.thankYouMessageDescription;
                    hasTranslation = true;
                }
                if (!(0, index_js_namespaceObject.isUndefined)(translation.thankYouMessageCloseButtonText)) {
                    translated.appearance.thankYouMessageCloseButtonText = translation.thankYouMessageCloseButtonText;
                    hasTranslation = true;
                }
                if (!(0, index_js_namespaceObject.isUndefined)(translation.submitButtonText)) {
                    translated.appearance.submitButtonText = translation.submitButtonText;
                    hasTranslation = true;
                }
                if (!(0, index_js_namespaceObject.isUndefined)(translation.backButtonText)) {
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
exports.applySurveyTranslation = __webpack_exports__.applySurveyTranslation;
exports.detectSurveyLanguage = __webpack_exports__.detectSurveyLanguage;
exports.findBestTranslationMatch = __webpack_exports__.findBestTranslationMatch;
exports.getBaseLanguage = __webpack_exports__.getBaseLanguage;
exports.getLanguageFromStoredPersonProperties = __webpack_exports__.getLanguageFromStoredPersonProperties;
exports.normalizeLanguageCode = __webpack_exports__.normalizeLanguageCode;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "applySurveyTranslation",
    "detectSurveyLanguage",
    "findBestTranslationMatch",
    "getBaseLanguage",
    "getLanguageFromStoredPersonProperties",
    "normalizeLanguageCode"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
