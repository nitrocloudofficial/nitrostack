// NitroStack Widget Runtime Polyfill
// This script listens for window.openai injection from the parent frame

(function () {
    'use strict';

    // Listen for openai runtime injection from parent
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'NITRO_INJECT_OPENAI') {
            console.log('📦 Received window.openai from parent frame');

            // Set up window.openai
            (window as any).openai = event.data.openai;

            // Dispatch event for widgets to know openai is ready
            const readyEvent = new CustomEvent('openai:ready');
            window.dispatchEvent(readyEvent);

            console.log('✅ window.openai initialized');
        }
    });

    // Also handle legacy toolOutput postMessage for backward compatibility
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'TOOL_OUTPUT' && event.data?.data) {
            console.log('📦 Received legacy toolOutput');
            if ((window as any).openai) {
                (window as any).openai.toolOutput = event.data.data;
            }
        }
    });
})();
