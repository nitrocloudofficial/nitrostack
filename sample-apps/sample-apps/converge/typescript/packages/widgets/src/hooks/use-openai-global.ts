import { useSyncExternalStore } from 'react';
import {
    SET_GLOBALS_EVENT_TYPE,
    SetGlobalsEvent,
    type OpenAiGlobals,
} from '../types.js';

/**
 * Hook to subscribe to a specific property of window.openai
 * Automatically re-renders when the property changes
 * 
 * @example
 * const theme = useOpenAiGlobal('theme');
 * const locale = useOpenAiGlobal('locale');
 * const maxHeight = useOpenAiGlobal('maxHeight');
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
    key: K
): OpenAiGlobals[K] | null {
    return useSyncExternalStore(
        (onChange) => {
            if (typeof window === 'undefined') {
                return () => { };
            }

            const handleSetGlobal = (event: SetGlobalsEvent) => {
                const value = event.detail.globals[key];
                if (value === undefined) {
                    return;
                }

                onChange();
            };

            window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal, {
                passive: true,
            });

            return () => {
                window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal);
            };
        },
        () => typeof window !== 'undefined' ? window.openai?.[key] ?? null : null,
        () => typeof window !== 'undefined' ? window.openai?.[key] ?? null : null
    );
}
