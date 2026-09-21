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
    ActionStepStringMatching: ()=>ActionStepStringMatching,
    Compression: ()=>Compression,
    FeatureFlagError: ()=>FeatureFlagError,
    PostHogPersistedProperty: ()=>PostHogPersistedProperty,
    SurveyMatchType: ()=>SurveyMatchType,
    SurveyPosition: ()=>SurveyPosition,
    SurveyQuestionBranchingType: ()=>SurveyQuestionBranchingType,
    SurveyQuestionDescriptionContentType: ()=>SurveyQuestionDescriptionContentType,
    SurveyQuestionType: ()=>SurveyQuestionType,
    SurveyRatingDisplay: ()=>SurveyRatingDisplay,
    SurveySchedule: ()=>SurveySchedule,
    SurveyType: ()=>SurveyType,
    SurveyValidationType: ()=>SurveyValidationType,
    SurveyWidgetType: ()=>SurveyWidgetType,
    knownUnsafeEditableEvent: ()=>knownUnsafeEditableEvent,
    knownUnsafeEditableEventProperty: ()=>knownUnsafeEditableEventProperty
});
var PostHogPersistedProperty = /*#__PURE__*/ function(PostHogPersistedProperty) {
    PostHogPersistedProperty["AnonymousId"] = "anonymous_id";
    PostHogPersistedProperty["DistinctId"] = "distinct_id";
    PostHogPersistedProperty["Props"] = "props";
    PostHogPersistedProperty["EnablePersonProcessing"] = "enable_person_processing";
    PostHogPersistedProperty["PersonMode"] = "person_mode";
    PostHogPersistedProperty["FeatureFlagDetails"] = "feature_flag_details";
    PostHogPersistedProperty["FeatureFlags"] = "feature_flags";
    PostHogPersistedProperty["FeatureFlagPayloads"] = "feature_flag_payloads";
    PostHogPersistedProperty["BootstrapFeatureFlagDetails"] = "bootstrap_feature_flag_details";
    PostHogPersistedProperty["BootstrapFeatureFlags"] = "bootstrap_feature_flags";
    PostHogPersistedProperty["BootstrapFeatureFlagPayloads"] = "bootstrap_feature_flag_payloads";
    PostHogPersistedProperty["OverrideFeatureFlags"] = "override_feature_flags";
    PostHogPersistedProperty["Queue"] = "queue";
    PostHogPersistedProperty["AiQueue"] = "ai_queue";
    PostHogPersistedProperty["LogsQueue"] = "logs_queue";
    PostHogPersistedProperty["OptedOut"] = "opted_out";
    PostHogPersistedProperty["SessionId"] = "session_id";
    PostHogPersistedProperty["SessionStartTimestamp"] = "session_start_timestamp";
    PostHogPersistedProperty["SessionLastTimestamp"] = "session_timestamp";
    PostHogPersistedProperty["PersonProperties"] = "person_properties";
    PostHogPersistedProperty["GroupProperties"] = "group_properties";
    PostHogPersistedProperty["InstalledAppBuild"] = "installed_app_build";
    PostHogPersistedProperty["InstalledAppVersion"] = "installed_app_version";
    PostHogPersistedProperty["SessionReplay"] = "session_replay";
    PostHogPersistedProperty["SessionReplayEventTriggerActivatedSession"] = "session_replay_event_trigger_activated_session";
    PostHogPersistedProperty["SurveyLastSeenDate"] = "survey_last_seen_date";
    PostHogPersistedProperty["SurveysSeen"] = "surveys_seen";
    PostHogPersistedProperty["Surveys"] = "surveys";
    PostHogPersistedProperty["RemoteConfig"] = "remote_config";
    PostHogPersistedProperty["FlagsEndpointWasHit"] = "flags_endpoint_was_hit";
    PostHogPersistedProperty["DeviceId"] = "device_id";
    return PostHogPersistedProperty;
}({});
var Compression = /*#__PURE__*/ function(Compression) {
    Compression["GZipJS"] = "gzip-js";
    Compression["Base64"] = "base64";
    return Compression;
}({});
const FeatureFlagError = {
    ERRORS_WHILE_COMPUTING: 'errors_while_computing_flags',
    FLAG_MISSING: 'flag_missing',
    QUOTA_LIMITED: 'quota_limited',
    TIMEOUT: 'timeout',
    CONNECTION_ERROR: 'connection_error',
    UNKNOWN_ERROR: 'unknown_error',
    apiError: (status)=>`api_error_${status}`
};
const SurveyPosition = {
    TopLeft: 'top_left',
    TopCenter: 'top_center',
    TopRight: 'top_right',
    MiddleLeft: 'middle_left',
    MiddleCenter: 'middle_center',
    MiddleRight: 'middle_right',
    Left: 'left',
    Right: 'right',
    Center: 'center'
};
const SurveyWidgetType = {
    Button: 'button',
    Tab: 'tab',
    Selector: 'selector'
};
const SurveyType = {
    Popover: 'popover',
    API: 'api',
    Widget: 'widget',
    ExternalSurvey: 'external_survey'
};
const SurveyQuestionDescriptionContentType = {
    Html: 'html',
    Text: 'text'
};
const SurveyValidationType = {
    MinLength: 'min_length',
    MaxLength: 'max_length'
};
const SurveyRatingDisplay = {
    Number: 'number',
    Emoji: 'emoji'
};
const SurveyQuestionType = {
    Open: 'open',
    MultipleChoice: 'multiple_choice',
    SingleChoice: 'single_choice',
    Rating: 'rating',
    Link: 'link'
};
const SurveyQuestionBranchingType = {
    NextQuestion: 'next_question',
    End: 'end',
    ResponseBased: 'response_based',
    SpecificQuestion: 'specific_question'
};
const SurveyMatchType = {
    Regex: 'regex',
    NotRegex: 'not_regex',
    Exact: 'exact',
    IsNot: 'is_not',
    Icontains: 'icontains',
    NotIcontains: 'not_icontains'
};
const SurveySchedule = {
    Once: 'once',
    Recurring: 'recurring',
    Always: 'always'
};
const ActionStepStringMatching = {
    Contains: 'contains',
    Exact: 'exact',
    Regex: 'regex'
};
const knownUnsafeEditableEvent = [
    '$snapshot',
    '$pageview',
    '$pageleave',
    '$set',
    'survey dismissed',
    'survey sent',
    'survey shown',
    '$identify',
    '$groupidentify',
    '$create_alias',
    '$$client_ingestion_warning',
    '$web_experiment_applied',
    '$feature_enrollment_update',
    '$feature_flag_called'
];
const knownUnsafeEditableEventProperty = [
    'token'
];
exports.ActionStepStringMatching = __webpack_exports__.ActionStepStringMatching;
exports.Compression = __webpack_exports__.Compression;
exports.FeatureFlagError = __webpack_exports__.FeatureFlagError;
exports.PostHogPersistedProperty = __webpack_exports__.PostHogPersistedProperty;
exports.SurveyMatchType = __webpack_exports__.SurveyMatchType;
exports.SurveyPosition = __webpack_exports__.SurveyPosition;
exports.SurveyQuestionBranchingType = __webpack_exports__.SurveyQuestionBranchingType;
exports.SurveyQuestionDescriptionContentType = __webpack_exports__.SurveyQuestionDescriptionContentType;
exports.SurveyQuestionType = __webpack_exports__.SurveyQuestionType;
exports.SurveyRatingDisplay = __webpack_exports__.SurveyRatingDisplay;
exports.SurveySchedule = __webpack_exports__.SurveySchedule;
exports.SurveyType = __webpack_exports__.SurveyType;
exports.SurveyValidationType = __webpack_exports__.SurveyValidationType;
exports.SurveyWidgetType = __webpack_exports__.SurveyWidgetType;
exports.knownUnsafeEditableEvent = __webpack_exports__.knownUnsafeEditableEvent;
exports.knownUnsafeEditableEventProperty = __webpack_exports__.knownUnsafeEditableEventProperty;
for(var __webpack_i__ in __webpack_exports__)if (-1 === [
    "ActionStepStringMatching",
    "Compression",
    "FeatureFlagError",
    "PostHogPersistedProperty",
    "SurveyMatchType",
    "SurveyPosition",
    "SurveyQuestionBranchingType",
    "SurveyQuestionDescriptionContentType",
    "SurveyQuestionType",
    "SurveyRatingDisplay",
    "SurveySchedule",
    "SurveyType",
    "SurveyValidationType",
    "SurveyWidgetType",
    "knownUnsafeEditableEvent",
    "knownUnsafeEditableEventProperty"
].indexOf(__webpack_i__)) exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
