import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import { useOpenAiGlobal } from './use-openai-global.js';
import type { UnknownObject } from '../types.js';

/**
 * Hook for managing widget state with automatic persistence
 * State is scoped to the widget instance (message_id/widgetId)
 * 
 * @example
 * const [state, setState] = useWidgetState(() => ({
 *   selectedItems: [],
 *   viewMode: 'grid'
 * }));
 * 
 * // Update state (automatically persists)
 * setState({ ...state, viewMode: 'list' });
 */
export function useWidgetState<T extends UnknownObject>(
    defaultState: T | (() => T)
): readonly [T, (state: SetStateAction<T>) => void];
export function useWidgetState<T extends UnknownObject>(
    defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void];
export function useWidgetState<T extends UnknownObject>(
    defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: SetStateAction<T | null>) => void] {
    const widgetStateFromWindow = useOpenAiGlobal('widgetState') as T;

    const [widgetState, _setWidgetState] = useState<T | null>(() => {
        if (widgetStateFromWindow != null) {
            return widgetStateFromWindow;
        }

        return typeof defaultState === 'function'
            ? defaultState()
            : defaultState ?? null;
    });

    useEffect(() => {
        _setWidgetState(widgetStateFromWindow);
    }, [widgetStateFromWindow]);

    const setWidgetState = useCallback(
        (state: SetStateAction<T | null>) => {
            _setWidgetState((prevState) => {
                const newState = typeof state === 'function' ? state(prevState) : state;

                if (newState != null && window.openai?.setWidgetState) {
                    window.openai.setWidgetState(newState);
                }

                return newState;
            });
        },
        []
    );

    return [widgetState, setWidgetState] as const;
}
