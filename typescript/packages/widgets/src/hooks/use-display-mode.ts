import { useOpenAiGlobal } from './use-openai-global.js';
import { type DisplayMode } from '../types.js';

/**
 * Hook to get the current display mode
 * Returns 'inline' | 'pip' | 'fullscreen'
 * 
 * @example
 * const displayMode = useDisplayMode();
 * const isFullscreen = displayMode === 'fullscreen';
 */
export const useDisplayMode = (): DisplayMode | null => {
    return useOpenAiGlobal('displayMode');
};
