import { mcp } from '../lib/mcp-client.js';

export class FloatingFactsComponent {
  constructor() {
    this.intervalId = null;
    this.hideTimeout = null;
    this.container = null;
  }

  init() {
    if (document.getElementById('floating-facts-container')) return;

    this.container = document.createElement('div');
    this.container.id = 'floating-facts-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      max-width: 340px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(250, 133, 90, 0.3);
      border-radius: 18px;
      padding: 16px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
      transform: translateY(120%);
      opacity: 0;
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    document.body.appendChild(this.container);

    // Initial show after 3 seconds
    setTimeout(() => this.fetchAndShowFact(), 3000);

    // Schedule recurring 5-minute timer (300,000 ms)
    this.intervalId = setInterval(() => this.fetchAndShowFact(), 300000);
  }

  async fetchAndShowFact() {
    if (!this.container) return;

    let factText = 'Your feet naturally splay outward by 3-5mm under heavy load to absorb ground reaction forces!';
    try {
      const res = await mcp.callTool('get_shoe_fact', {});
      if (res && res.fact) {
        factText = res.fact;
      }
    } catch {
      // Fallback text
    }

    this.container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">💡</span>
          <span style="font-weight: 800; font-size: 12px; color: var(--color-coral); text-transform: uppercase; letter-spacing: 0.05em;">
            Did You Know?
          </span>
        </div>
        <button id="btn-close-fact" style="
          background: rgba(0,0,0,0.06); 
          border: none; 
          border-radius: 50%; 
          width: 22px; 
          height: 22px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          cursor: pointer; 
          font-size: 12px; 
          color: var(--color-text-muted);
        ">✕</button>
      </div>
      <p style="font-size: 13px; color: var(--color-text); line-height: 1.45; margin: 0; font-weight: 500;">
        ${factText}
      </p>
      <div style="font-size: 10px; color: var(--color-text-muted); margin-top: 8px; font-style: italic;">
        ✨ Powered by Loom&Stride AI Agent
      </div>
    `;

    // Slide in
    this.container.style.transform = 'translateY(0)';
    this.container.style.opacity = '1';

    // Hook close button
    document.getElementById('btn-close-fact')?.addEventListener('click', () => {
      this.hide();
    });

    // Auto-dismiss after 15 seconds
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => this.hide(), 15000);
  }

  hide() {
    if (!this.container) return;
    this.container.style.transform = 'translateY(120%)';
    this.container.style.opacity = '0';
  }
}

export const floatingFacts = new FloatingFactsComponent();
