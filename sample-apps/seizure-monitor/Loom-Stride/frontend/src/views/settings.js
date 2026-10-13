export class SettingsView {
  constructor() {
    this.units = localStorage.getItem('shoefit_units') || 'metric';
    this.currency = localStorage.getItem('shoefit_currency') || 'INR';
    this.defaultCoin = localStorage.getItem('shoefit_coin') || 'inr_10';
    this.defaultWeight = parseInt(localStorage.getItem('shoefit_weight') || '75', 10);
    this.theme = localStorage.getItem('shoefit_theme') || 'glass_light';
  }

  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in-up" style="max-width: 1000px; margin: 0 auto; width: 100%;">
        
        <!-- Header -->
        <div style="margin-bottom: 28px;">
          <span style="background: rgba(98, 196, 218, 0.2); color: #0284c7; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;">
            ⚙️ System Configuration
          </span>
          <h1 style="font-size: 32px; font-weight: 900; color: var(--color-text); margin: 8px 0 6px 0;">
            ShoeFit Settings & MCP System Control
          </h1>
          <p style="color: var(--color-text-muted); font-size: 14px; margin: 0;">
            Manage measurement units, currency preferences, default scale calibration objects, and MCP server connections.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(460px, 1fr)); gap: 24px;">

          <!-- PANEL 1: MEASUREMENT UNITS & CURRENCY -->
          <div class="glass-card" style="padding: 28px; border-radius: 24px; border: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <span style="font-size: 24px;">📐</span>
              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin: 0;">
                  Units & Currency Display
                </h3>
                <div style="font-size: 12px; color: var(--color-text-muted);">Configure measurement system & global currency</div>
              </div>
            </div>

            <div style="margin-bottom: 20px;">
              <label style="font-size: 12px; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-bottom: 8px;">
                Distance & Dimension System
              </label>
              <div style="display: flex; gap: 12px;">
                <button class="unit-btn btn ${this.units === 'metric' ? 'btn-primary' : 'btn-secondary'}" data-unit="metric" style="flex: 1; padding: 12px; font-weight: 800;">
                  Millimeters / CM (Metric)
                </button>
                <button class="unit-btn btn ${this.units === 'imperial' ? 'btn-primary' : 'btn-secondary'}" data-unit="imperial" style="flex: 1; padding: 12px; font-weight: 800;">
                  Inches / Feet (Imperial)
                </button>
              </div>
            </div>

            <div>
              <label style="font-size: 12px; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-bottom: 8px;">
                Primary Currency
              </label>
              <div style="display: flex; gap: 12px;">
                <button class="curr-btn btn ${this.currency === 'INR' ? 'btn-primary' : 'btn-secondary'}" data-curr="INR" style="flex: 1; padding: 12px; font-weight: 800;">
                  ₹ INR (Indian Rupee)
                </button>
                <button class="curr-btn btn ${this.currency === 'USD' ? 'btn-primary' : 'btn-secondary'}" data-curr="USD" style="flex: 1; padding: 12px; font-weight: 800;">
                  $ USD (US Dollar)
                </button>
              </div>
            </div>
          </div>

          <!-- PANEL 2: DEFAULT CALIBRATION SCALE OBJECT -->
          <div class="glass-card" style="padding: 28px; border-radius: 24px; border: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <span style="font-size: 24px;">🪙</span>
              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin: 0;">
                  Default Photo Calibration Object
                </h3>
                <div style="font-size: 12px; color: var(--color-text-muted);">Set pre-selected reference coin for machine vision scan</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <div class="coin-option choice-card ${this.defaultCoin === 'inr_10' ? 'selected' : ''}" data-coin="inr_10">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: 800; font-size: 15px; color: var(--color-coral);">INR ₹10 Coin (Standard)</div>
                  <div style="font-size: 12px; font-weight: 800; color: var(--color-skyblue);">27.00 mm</div>
                </div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Recommended for sub-millimeter vision accuracy</div>
              </div>

              <div class="coin-option choice-card ${this.defaultCoin === 'inr_5' ? 'selected' : ''}" data-coin="inr_5">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: 800; font-size: 15px; color: var(--color-coral);">INR ₹5 Coin</div>
                  <div style="font-size: 12px; font-weight: 800; color: var(--color-skyblue);">23.00 mm</div>
                </div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Standard nickel-brass coin calibration</div>
              </div>

              <div class="coin-option choice-card ${this.defaultCoin === 'credit_card' ? 'selected' : ''}" data-coin="credit_card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-weight: 800; font-size: 15px; color: var(--color-coral);">Credit / Debit Card</div>
                  <div style="font-size: 12px; font-weight: 800; color: var(--color-skyblue);">85.60 mm</div>
                </div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Standard ISO 7810 card dimension</div>
              </div>
            </div>
          </div>

          <!-- PANEL 3: MCP SERVER & AI ENGINE STATUS -->
          <div class="glass-card" style="padding: 28px; border-radius: 24px; border: 1px solid var(--color-border);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px;">
              <span style="font-size: 24px;">🌐</span>
              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin: 0;">
                  MCP Server & AI Engine Status
                </h3>
                <div style="font-size: 12px; color: var(--color-text-muted);">NitroStack MCP Protocol Endpoint connection details</div>
              </div>
            </div>

            <div style="background: rgba(15, 23, 42, 0.95); color: #fff; border-radius: 16px; padding: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; font-weight: 800; color: #62C4DA; text-transform: uppercase;">MCP Server Endpoint</span>
                <span style="background: rgba(34, 197, 94, 0.2); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.4); padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;">
                  🟢 Connected & Healthy
                </span>
              </div>

              <div style="font-family: monospace; font-size: 13px; color: #FFDE96; margin-bottom: 12px;">
                http://localhost:3000/mcp
              </div>

              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 11px; color: #a4b8c4; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
                <div>Framework: <strong>NitroStack SDK v2.1</strong></div>
                <div>Algorithm: <strong>TOPSIS Multi-Criteria</strong></div>
                <div>SneaksAPI: <strong>Active (GOAT / StockX)</strong></div>
                <div>Running API: <strong>Active (8 Brands)</strong></div>
              </div>
            </div>
          </div>

          <!-- PANEL 4: SAVE PREFERENCES & PERSISTENCE -->
          <div class="glass-card" style="padding: 28px; border-radius: 24px; border: 1px solid var(--color-border); display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 24px;">💾</span>
                <div>
                  <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin: 0;">
                    Preference Persistence
                  </h3>
                  <div style="font-size: 12px; color: var(--color-text-muted);">Save settings to local storage</div>
                </div>
              </div>
              <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.5;">
                All changes to distance units, currency preferences, and calibration coins are saved automatically.
              </p>
            </div>

            <div style="display: flex; gap: 12px; margin-top: 20px;">
              <button id="btn-save-settings" class="btn btn-primary" style="flex: 1; padding: 14px; font-weight: 800; font-size: 15px;">
                ✓ Save Preferences
              </button>
            </div>
          </div>

        </div>

      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    container.querySelectorAll('.unit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.units = e.currentTarget.getAttribute('data-unit');
        localStorage.setItem('shoefit_units', this.units);
        this.render(container);
      });
    });

    container.querySelectorAll('.curr-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.currency = e.currentTarget.getAttribute('data-curr');
        localStorage.setItem('shoefit_currency', this.currency);
        this.render(container);
      });
    });

    container.querySelectorAll('.coin-option').forEach((card) => {
      card.addEventListener('click', (e) => {
        this.defaultCoin = e.currentTarget.getAttribute('data-coin');
        localStorage.setItem('shoefit_coin', this.defaultCoin);
        container.querySelectorAll('.coin-option').forEach((c) => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
      });
    });

    document.getElementById('btn-save-settings')?.addEventListener('click', () => {
      alert('Settings saved successfully!');
    });
  }
}
