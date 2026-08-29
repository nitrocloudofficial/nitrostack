import { SurveyValidationType } from "../types.mjs";
function getValidationError(value, rules, optional) {
    const trimmed = value.trim();
    if (!optional && '' === trimmed) return 'This field is required';
    if ('' === trimmed) return false;
    if (rules && rules.length > 0) for (const rule of rules)switch(rule.type){
        case SurveyValidationType.MinLength:
            if (void 0 !== rule.value && trimmed.length < rule.value) return rule.errorMessage ?? `Please enter at least ${rule.value} characters`;
            break;
        case SurveyValidationType.MaxLength:
            if (void 0 !== rule.value && trimmed.length > rule.value) return rule.errorMessage ?? `Please enter no more than ${rule.value} characters`;
            break;
    }
    return false;
}
function getLengthFromRules(rules, type) {
    if (!rules) return;
    const rule = rules.find((r)=>r.type === type);
    return rule?.value;
}
function getRequirementsHint(minLength, maxLength) {
    const effectiveMin = 1 === minLength ? void 0 : minLength;
    if (effectiveMin && maxLength) return `Enter ${effectiveMin}-${maxLength} characters`;
    if (effectiveMin) {
        const plural = 1 === effectiveMin ? 'character' : 'characters';
        return `Enter at least ${effectiveMin} ${plural}`;
    }
    if (maxLength) {
        const plural = 1 === maxLength ? 'character' : 'characters';
        return `Maximum ${maxLength} ${plural}`;
    }
}
export { getLengthFromRules, getRequirementsHint, getValidationError };
