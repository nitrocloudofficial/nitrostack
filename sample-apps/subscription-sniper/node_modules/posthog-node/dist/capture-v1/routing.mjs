const AI_EVENT_PREFIX = '$ai_';
const ANALYTICS_ROUTE = 'analytics';
const AI_ROUTE = 'ai';
function isLegacyOnlyEvent(message) {
    return 'string' == typeof message.event && message.event.startsWith(AI_EVENT_PREFIX);
}
export { AI_ROUTE, ANALYTICS_ROUTE, isLegacyOnlyEvent };
