/**
 * React hook to access the Widget SDK
 */

import { useEffect, useState } from 'react';
import { getWidgetSDK } from '../sdk.js';
import { useOpenAiGlobal } from './use-openai-global.js';

/**
 * Hook to access the Widget SDK instance
 * 
 * @example
 * ```tsx
 * const { callTool, requestFullscreen, getTheme } = useWidgetSDK();
 * 
 * // Call a tool
 * await callTool('show_pizza_shop', { shopId: '123' });
 * 
 * // Request fullscreen
 * await requestFullscreen();
 * 
 * // Get theme
 * const theme = getTheme();
 * ```
 */
export function useWidgetSDK() {
    const [sdk] = useState(() => getWidgetSDK());
    const [isReady, setIsReady] = useState(sdk.isReady());
    
    // Subscribe to global tool output changes to ensure re-renders
    // These hooks use useSyncExternalStore internally for reactivity
    const toolOutput = useOpenAiGlobal('toolOutput');
    const toolInput = useOpenAiGlobal('toolInput');
    const theme = useOpenAiGlobal('theme');
    const maxHeight = useOpenAiGlobal('maxHeight');
    const displayMode = useOpenAiGlobal('displayMode');

    useEffect(() => {
        if (isReady) return;

        const checkReady = () => setIsReady(true);
        window.addEventListener('openai:ready', checkReady);

        // Check immediately in case it's already ready
        if (sdk.isReady()) {
            setIsReady(true);
        }

        return () => window.removeEventListener('openai:ready', checkReady);
    }, [sdk, isReady]);

    return {
        // SDK instance
        sdk,
        isReady,

        // Reactive Data (triggers re-renders)
        toolOutput,
        toolInput,
        theme,
        maxHeight,
        displayMode,

        // State management
        setState: sdk.setState.bind(sdk),
        getState: sdk.getState.bind(sdk),

        // Tool calling
        callTool: sdk.callTool.bind(sdk),

        // Display controls
        requestFullscreen: sdk.requestFullscreen.bind(sdk),
        requestInline: sdk.requestInline.bind(sdk),
        requestPip: sdk.requestPip.bind(sdk),
        requestDisplayMode: sdk.requestDisplayMode.bind(sdk),
        requestClose: sdk.requestClose.bind(sdk),

        // Navigation
        openExternal: sdk.openExternal.bind(sdk),
        sendFollowUpMessage: sdk.sendFollowUpMessage.bind(sdk),

        // Data access methods
        getToolInput: sdk.getToolInput.bind(sdk),
        getToolOutput: sdk.getToolOutput.bind(sdk),
        getOutput: sdk.getOutput.bind(sdk),
        getToolResponseMetadata: sdk.getToolResponseMetadata.bind(sdk),
        getTheme: sdk.getTheme.bind(sdk),
        getMaxHeight: sdk.getMaxHeight.bind(sdk),
        getDisplayMode: sdk.getDisplayMode.bind(sdk),
        getUserAgent: sdk.getUserAgent.bind(sdk),
        getLocale: sdk.getLocale.bind(sdk),
        getSafeArea: sdk.getSafeArea.bind(sdk),
        
        // Convenience
        isDarkMode: () => (theme || sdk.getTheme()) === 'dark',
    };
}
