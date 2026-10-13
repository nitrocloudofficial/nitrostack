import { mcp } from '../lib/mcp-client.js';
import { renderConfidenceRing } from '../components/confidence-ring.js';
import { renderLoader, logProgress } from '../components/loader.js';

export class MeasurementView {
  constructor(coinId, photo, onNext, onBack) {
    this.coinId = coinId;
    this.photo = photo;
    this.onNext = onNext;
    this.onBack = onBack;
    this.result = null;
  }

  async runMeasurement(container) {
    container.innerHTML = renderLoader('Analyzing image and automatically locating coin and foot…');

    try {
      logProgress('Preparing photo payload for analysis...', 'info');
      
      const payloadSizeKb = Math.round((this.photo.fileContent.length * 3) / 4 / 1024);
      logProgress(`Image compressed automatically on client: ~${payloadSizeKb} KB (JPEG 0.65)`, 'success');
      logProgress(`Starting foot calibration with coin type: "${this.coinId}"`, 'info');
      
      logProgress('Connecting to server endpoint: http://localhost:3000/mcp...', 'info');
      
      const args = {
        coin_type: this.coinId,
        photo_mode: 'combined',
        combined_photo: {
          file_name: this.photo.fileName,
          file_type: this.photo.fileType,
          file_content: this.photo.fileContent
        }
      };
      
      const data = await mcp.callTool('measure_foot', args);

      logProgress('Analyzing foot contours and color features...', 'info');
      logProgress('Analyzing circularity profile of components for coin location...', 'info');

      if (data && data.length_mm) {
        logProgress('Calculations completed successfully!', 'success');
        logProgress(`Foot dimensions: ${data.length_mm}mm x ${data.width_mm}mm`, 'success');
        logProgress(`Width category determined: ${data.width_category}`, 'success');
        logProgress(`Coin auto-detected at position x: ${data.coin_bounds_px.x}, y: ${data.coin_bounds_px.y}`, 'success');
        
        // Wait briefly so the user can read the console, then render
        setTimeout(() => {
          this.result = data;
          this.renderResults(container);
        }, 1200);
      } else {
        throw new Error('Analysis failed or returned empty result');
      }
    } catch (e) {
      const errorMsg = e.message || String(e);
      let descriptiveTitle = 'Analysis Failed';
      let descriptiveText = 'We could not detect your foot or the coin in the photo. Please make sure the coin is placed flat next to your foot with high contrast and overhead lighting.';

      if (errorMsg.includes('413') || errorMsg.toLowerCase().includes('payload too large') || errorMsg.toLowerCase().includes('large')) {
        descriptiveTitle = 'HTTP 413: Payload Too Large';
        descriptiveText = 'The capture resolution was too high for the server payload limits. We have automatically enabled client-side image compression to downscale your photos and resolve this. Please click "Try Again" to capture/upload a optimized image.';
      }

      logProgress('Analysis task failed: ' + errorMsg, 'error');
      container.innerHTML = `
        <div class="glass-card text-center animate-fade-in-up" style="padding: 40px 20px;">
          <div style="font-size: 40px; margin-bottom: 16px;">⚠️</div>
          <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 12px; color: var(--color-danger);">${descriptiveTitle}</h2>
          <p style="color: var(--color-text-muted); font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
            ${descriptiveText}
          </p>
          <div style="font-size: 12px; color: var(--color-text-muted); background: rgba(255,255,255,0.02); padding: 10px; border-radius: 6px; font-family: monospace; margin-bottom: 24px; text-align: left; overflow-x: auto;">
            Error Details: ${errorMsg}
          </div>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-secondary" id="btn-measure-retry">Try Again</button>
          </div>
        </div>
      `;
      document.getElementById('btn-measure-retry').addEventListener('click', () => {
        this.onBack();
      });
    }
  }

  renderResults(container) {
    const foot = this.result.foot_bounds_px || { x: 0, y: 0, width: 0, height: 0 };
    const coin = this.result.coin_bounds_px || { x: 0, y: 0, width: 0, height: 0 };
    const aw = this.result.analysis_width || 900;
    const ah = this.result.analysis_height || 675;

    // Calculate percentage overlays
    const footLeft = (foot.x / aw) * 100;
    const footTop = (foot.y / ah) * 100;
    const footWidth = (foot.width / aw) * 100;
    const footHeight = (foot.height / ah) * 100;

    const coinLeft = (coin.x / aw) * 100;
    const coinTop = (coin.y / ah) * 100;
    const coinWidth = (coin.width / aw) * 100;
    const coinHeight = (coin.height / ah) * 100;

    const imgSrc = this.photo.fileContent.startsWith('data:')
      ? this.photo.fileContent
      : `data:image/jpeg;base64,${this.photo.fileContent}`;

    container.innerHTML = `
      <div class="wizard-box animate-fade-in-up">
        <div class="step-indicator">
          <div class="step-node completed">1</div>
          <div class="step-node completed">2</div>
          <div class="step-node active">3</div>
        </div>

        <div class="glass-card">
          <div class="results-header">
            ${renderConfidenceRing(this.result.confidence)}
            <div>
              <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">Analysis Complete</h2>
              <p style="color: var(--color-text-muted); font-size: 13px;">
                Calibrated with ${this.result.coin_label} (${this.result.coin_diameter_mm} mm)
              </p>
            </div>
          </div>

          <!-- Redesigned Auto-Detection Photo Overlay -->
          <div style="margin-bottom: 30px; text-align: center;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--color-text); text-align: left;">Auto-Detection Preview</h4>
            <div style="
              position: relative; 
              display: inline-block; 
              width: 100%; 
              max-width: 480px; 
              border-radius: var(--radius-md); 
              overflow: hidden; 
              border: 1px solid var(--color-border);
              box-shadow: var(--shadow-sm);
            ">
              <img src="${imgSrc}" style="width: 100%; display: block; object-fit: contain;" />
              
              <!-- Foot overlay box -->
              ${foot.width > 0 ? `
                <div style="
                  position: absolute;
                  left: ${footLeft}%;
                  top: ${footTop}%;
                  width: ${footWidth}%;
                  height: ${footHeight}%;
                  border: 2.5px solid var(--color-success);
                  border-radius: 6px;
                  box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);
                  pointer-events: none;
                ">
                  <span style="
                    position: absolute;
                    top: -22px;
                    left: -2px;
                    background: var(--color-success);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    white-space: nowrap;
                  ">Auto-Found Foot</span>
                </div>
              ` : ''}

              <!-- Coin/Card overlay circle or rectangle -->
              ${coin.width > 0 ? `
                <div style="
                  position: absolute;
                  left: ${coinLeft}%;
                  top: ${coinTop}%;
                  width: ${coinWidth}%;
                  height: ${coinHeight}%;
                  border: 2.5px solid var(--color-warning);
                  border-radius: ${this.result.coin_type === 'credit_card' ? '6px' : '50%'};
                  box-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
                  pointer-events: none;
                ">
                  <span style="
                    position: absolute;
                    top: -22px;
                    left: -2px;
                    background: var(--color-warning);
                    color: #fff;
                    font-size: 10px;
                    font-weight: 700;
                    padding: 2px 6px;
                    border-radius: 4px;
                    white-space: nowrap;
                  ">${this.result.coin_type === 'credit_card' ? 'Auto-Found Card' : 'Auto-Found Coin'}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="results-grid">
            <div class="result-card">
              <div class="result-label">↕️ Length</div>
              <div class="result-val">${this.result.length_mm} <span style="font-size: 14px; font-weight: 500; color: var(--color-text-muted);">mm</span></div>
              <div class="result-label">Inches: ${((this.result.length_mm) / 25.4).toFixed(1)}"</div>
            </div>
            <div class="result-card">
              <div class="result-label">↔️ Width</div>
              <div class="result-val">${this.result.width_mm} <span style="font-size: 14px; font-weight: 500; color: var(--color-text-muted);">mm</span></div>
              <div class="result-label">Category: <span style="text-transform: capitalize; color: var(--color-text); font-weight: 600;">${this.result.width_category.replace('_', ' ')}</span></div>
            </div>
            <div class="result-card">
              <div class="result-label">📐 Ratio</div>
              <div class="result-val">${this.result.ratio.toFixed(3)}</div>
              <div class="result-label">Length / Width</div>
            </div>
          </div>

          <div style="background: rgba(99, 102, 241, 0.08); border-left: 4px solid var(--color-primary); padding: 16px; border-radius: var(--radius-sm); margin-bottom: 24px;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 4px; color: var(--color-text);">Sizing Tip</h4>
            <p style="font-size: 13px; color: var(--color-text-muted); line-height: 1.5;">
              ${this.result.sizing_tip}
            </p>
          </div>

          <div style="margin-bottom: 30px;">
            <h4 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; color: var(--color-text);">Calibration Details</h4>
            <ul style="font-size: 12px; color: var(--color-text-muted); line-height: 1.6; padding-left: 18px; list-style-type: disc;">
              ${this.result.notes.map(note => `<li>${note}</li>`).join('')}
            </ul>
          </div>

          <div style="display: flex; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 20px;">
            <button class="btn btn-secondary" id="btn-measure-back">Retake</button>
            <button class="btn btn-primary" id="btn-measure-next">Continue to Assessment 📋</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-measure-back').addEventListener('click', () => {
      this.onBack();
    });

    document.getElementById('btn-measure-next').addEventListener('click', () => {
      this.onNext(this.result);
    });
  }

  render(container) {
    if (!this.result) {
      this.runMeasurement(container);
    } else {
      this.renderResults(container);
    }
  }
}
