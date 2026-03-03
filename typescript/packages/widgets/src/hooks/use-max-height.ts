import { useOpenAiGlobal } from './use-openai-global.js';

/**
 * Hook to get the maximum available height for the widget
 * Useful for responsive layouts
 * 
 * @example
 * const maxHeight = useMaxHeight();
 * return <div style={{ maxHeight }}>{content}</div>;
 */
export const useMaxHeight = (): number | null => {
    return useOpenAiGlobal('maxHeight');
};
