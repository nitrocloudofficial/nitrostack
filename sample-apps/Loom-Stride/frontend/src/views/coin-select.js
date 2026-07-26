import { mcp } from '../lib/mcp-client.js';

export class CoinSelectView {
  constructor(onNext, onBack) {
    this.onNext = onNext;
    this.onBack = onBack;
    this.selectedCoinId = 'inr_10'; // default
    this.coins = [
      { id: 'inr_10', label: 'INR ₹10 Coin', diameter_mm: 27.0, icon: '🪙' },
      { id: 'inr_5', label: 'INR ₹5 Coin', diameter_mm: 23.0, icon: '🪙' },
      { id: 'credit_card', label: 'Standard Debit / Credit Card', diameter_mm: 85.6, icon: '💳' },
    ];
  }

  async loadCoins(container) {
    try {
      const data = await mcp.callTool('list_supported_coins', {});
      if (data && data.coins && data.coins.length > 0) {
        this.coins = data.coins
          .filter((c) => ['inr_5', 'inr_10', 'credit_card'].includes(c.id))
          .map((c) => (c.id === 'inr_5' ? { ...c, diameter_mm: 23.0 } : c));
      }
    } catch {
      // Use fallback 3 coins
    }
    this.renderCoinsGrid(container);
  }

  renderCoinsGrid(container) {
    container.innerHTML = `
      <div class="wizard-box animate-fade-in-up" style="width: 100%;">
        <!-- Step Progress Bar -->
        <div class="step-indicator">
          <div class="step-node active">1</div>
          <div class="step-node">2</div>
          <div class="step-node">3</div>
          <div class="step-node">4</div>
          <div class="step-node">5</div>
        </div>

        <div class="glass-card" style="padding: 32px; border-radius: 28px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background: rgba(250, 133, 90, 0.15); color: var(--color-coral); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
              Step 1 • Scale Calibration
            </span>
            <h2 style="font-size: 26px; font-weight: 900; color: var(--color-text); margin: 8px 0 6px 0;">
              Select Calibration Object
            </h2>
            <p style="color: var(--color-text-muted); font-size: 14px; margin: 0;">
              Choose the coin or card you will place next to your foot for sub-millimeter scale calibration.
            </p>
          </div>

          <!-- 3 Allowed Calibration Cards -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px;">
            ${this.coins
              .map(
                (coin) => `
              <div class="coin-card ${coin.id === this.selectedCoinId ? 'selected' : ''}" data-id="${coin.id}" style="
                background: var(--color-card);
                border: 2px solid ${coin.id === this.selectedCoinId ? 'var(--color-coral)' : 'var(--color-border)'};
                border-radius: 20px;
                padding: 20px;
                text-align: center;
                cursor: pointer;
                transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
                box-shadow: ${coin.id === this.selectedCoinId ? '0 0 20px rgba(250, 133, 90, 0.25)' : 'var(--shadow-sm)'};
              ">
                <div style="
                  font-size: 32px; 
                  margin-bottom: 8px;
                  display: flex; align-items: center; justify-content: center; height: 48px;
                ">
                  ${coin.id === 'credit_card' ? '💳' : '🪙'}
                </div>
                <div style="font-weight: 800; font-size: 16px; color: var(--color-text);">${coin.label}</div>
                <div style="font-size: 13px; color: var(--color-coral); font-weight: 700; margin-top: 4px;">
                  ${coin.id === 'credit_card' ? '85.6 mm width' : `${coin.diameter_mm} mm diameter`}
                </div>
              </div>
            `
              )
              .join('')}
          </div>

          <!-- GHIBLI PICTORIAL USAGE GUIDE DIAGRAM -->
          <div style="
            background: rgba(18, 28, 34, 0.92);
            border: 1px solid rgba(250, 133, 90, 0.3);
            border-radius: 24px;
            padding: 24px;
            color: #ffffff;
            margin-bottom: 28px;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.2);
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 18px;">🎨</span>
                <h3 style="font-size: 16px; font-weight: 800; color: #FFDE96; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
                  Pictorial Guide: How to Place Object & Photo
                </h3>
              </div>
              <span style="background: rgba(250, 133, 90, 0.2); color: #FA855A; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 800;">
                Ghibli Style Scan
              </span>
            </div>

            <!-- Ghibli Artwork Box with Laser Sweep -->
            <div style="
              border-radius: 18px;
              overflow: hidden;
              height: 200px;
              position: relative;
              margin-bottom: 20px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.4);
              border: 1px stroke rgba(255,255,255,0.15);
            ">
              <div class="laser-sweep-line"></div>
              <img src="/images/ghibli-hero.png" alt="Bare foot with coin ruler on paper illustration" style="
                width: 100%; height: 100%; object-fit: cover; object-position: center;
              " />
            </div>

            <!-- 3 Pictorial Step Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
              <div style="background: rgba(255,255,255,0.06); padding: 14px; border-radius: 14px; border-left: 3px solid #FA855A;">
                <div style="font-weight: 800; font-size: 13px; color: #FA855A; margin-bottom: 4px;">1. Place Flat on Floor</div>
                <div style="font-size: 12px; color: #a4b8c4;">Place your ₹5, ₹10 coin or card flat on a light floor beside your bare foot.</div>
              </div>

              <div style="background: rgba(255,255,255,0.06); padding: 14px; border-radius: 14px; border-left: 3px solid #FFDE96;">
                <div style="font-weight: 800; font-size: 13px; color: #FFDE96; margin-bottom: 4px;">2. Align Parallel</div>
                <div style="font-size: 12px; color: #a4b8c4;">Ensure the object is at the exact same level (not on a rug or tilted).</div>
              </div>

              <div style="background: rgba(255,255,255,0.06); padding: 14px; border-radius: 14px; border-left: 3px solid #62C4DA;">
                <div style="font-weight: 800; font-size: 13px; color: #62C4DA; margin-bottom: 4px;">3. Snap Overhead</div>
                <div style="font-size: 12px; color: #a4b8c4;">Hold your phone directly overhead looking straight down at 90 degrees.</div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 20px;">
            <button class="btn btn-secondary" id="btn-coin-back" style="padding: 12px 24px;">Back</button>
            <button class="btn btn-primary" id="btn-coin-next" style="
              padding: 12px 36px; 
              border-radius: 14px; 
              font-size: 15px; 
              font-weight: 800;
              background: var(--grad-accent);
              box-shadow: 0 4px 16px rgba(250, 133, 90, 0.35);
            ">
              Continue to Photo &rarr;
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook click listeners
    const cards = container.querySelectorAll('.coin-card');
    cards.forEach((card) => {
      card.addEventListener('click', () => {
        cards.forEach((c) => {
          c.classList.remove('selected');
          c.style.borderColor = 'var(--color-border)';
          c.style.boxShadow = 'var(--shadow-sm)';
        });
        card.classList.add('selected');
        card.style.borderColor = 'var(--color-coral)';
        card.style.boxShadow = '0 0 20px rgba(250, 133, 90, 0.25)';
        this.selectedCoinId = card.getAttribute('data-id');
      });
    });

    document.getElementById('btn-coin-back')?.addEventListener('click', () => {
      this.onBack();
    });

    document.getElementById('btn-coin-next')?.addEventListener('click', () => {
      this.onNext(this.selectedCoinId);
    });
  }

  render(container) {
    this.loadCoins(container);
  }
}
