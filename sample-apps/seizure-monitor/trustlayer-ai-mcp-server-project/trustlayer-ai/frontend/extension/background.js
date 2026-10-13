// TrustLayer AI — background service worker
//
// NOTE: manifest.json sets a default_popup, so chrome.action.onClicked will
// NOT fire on icon click — Chrome opens popup.html instead. Capture-on-click
// logic therefore belongs in popup.js (built in Hours 6-12), not here.
//
// This file is a deliberate empty shell for now. It exists so the manifest's
// "background.service_worker" entry resolves, and as a place to add
// cross-tab state or alarm-based logic later if needed (none required yet).

console.log("TrustLayer AI background service worker loaded.");
