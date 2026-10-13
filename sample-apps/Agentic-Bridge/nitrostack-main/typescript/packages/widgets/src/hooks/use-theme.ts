import { useOpenAiGlobal } from './use-openai-global.js';
import { type Theme } from '../types.js';

/**
 * Hook to get the current theme ('light' | 'dark')
 * 
 * @example
 * const theme = useTheme();
 * const bgColor = theme === 'dark' ? '#000' : '#fff';
 */
export const useTheme = (): Theme | null => {
    return useOpenAiGlobal('theme');
};
