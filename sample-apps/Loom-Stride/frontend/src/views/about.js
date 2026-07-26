export class AboutView {
  constructor(onBack) {
    this.onBack = onBack;
  }

  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in-up" style="max-width: 800px; margin: 0 auto;">
        
        <!-- Apple Glass Card -->
        <div class="glass-card" style="padding: 40px; margin-bottom: 30px; position: relative; overflow: hidden;">
          <!-- Fluid colored blur nodes behind card -->
          <div style="
            position: absolute;
            top: -20%;
            left: -20%;
            width: 250px;
            height: 250px;
            background: radial-gradient(circle, var(--color-primary-glow) 0%, transparent 70%);
            z-index: 0;
            opacity: 0.6;
          "></div>
          
          <div style="position: relative; z-index: 1;">
            <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 12px; color: var(--color-text);">
              Know How — Foot Biomechanics & Technology
            </h1>
            <p class="subtitle" style="font-size: 16px; color: var(--color-text-muted); margin-bottom: 30px; line-height: 1.6;">
              Loom&Stride AI is a smart foot measurement tool designed to fix the limitations of traditional shoe sizing. Length alone doesn't define fit; foot shape, width, and dynamic load splay determine real comfort.
            </p>

            <!-- Featured Enlarged Athletic Shoe Anatomy Diagram -->
            <div style="
              background: rgba(15, 23, 42, 0.5); 
              border: 1px solid rgba(250, 133, 90, 0.3); 
              border-radius: 24px; 
              overflow: hidden; 
              margin-bottom: 36px;
              box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
            ">
              <div style="position: relative; width: 100%; height: 360px; overflow: hidden; background: #000;">
                <img src="/images/loom-stride-shoe-anatomy.png" alt="Athletic Shoe Cushioning & Stack Height Anatomy" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" />
                <div style="
                  position: absolute; bottom: 0; left: 0; right: 0; 
                  background: linear-gradient(to top, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.4) 70%, transparent 100%);
                  padding: 24px 28px;
                ">
                  <h3 style="font-size: 22px; font-weight: 900; color: #fff; margin-bottom: 6px; display: flex; align-items: center; gap: 10px;">
                    <span>👟</span> Athletic Shoe Technical Anatomy & Biomechanics
                  </h3>
                  <p style="font-size: 13px; color: #cbd5e1; line-height: 1.5; margin: 0; max-width: 680px;">
                    Loom&Stride matches your calibrated millimeter length, forefoot splay, and BMI dynamic load against midsole EVA foam densities, carbon fiber flyplates, stack heights, and heel counter stiffness.
                  </p>
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 32px;">
              
              <!-- Section 1 -->
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span>🔍</span> How to Use Loom&Stride Sizer
                </h3>
                <ol style="color: var(--color-text-muted); font-size: 14px; line-height: 1.8; padding-left: 20px;">
                  <li><strong>Select Scale Reference</strong>: Place a standard coin or a credit card on a flat floor beside your foot.</li>
                  <li><strong>Take Photo</strong>: Snap a direct top-down photo containing both the coin/card and your bare foot. Keep the camera flat.</li>
                  <li><strong>Calibrate Scan</strong>: Our computer-vision algorithms locate the coin edge to detect the exact pixel-to-millimeter ratio, outputting precise physical foot dimensions.</li>
                  <li><strong>Review Sizing</strong>: Your dimensions are matched against official shoe size charts in our database, with dynamic adjustments for your height and weight.</li>
                </ol>
              </div>

              <!-- Section 2 -->
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span>📐</span> How We Came Up with the Ratios
                </h3>
                <p style="color: var(--color-text-muted); font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
                  Classic shoe sizing (US/UK/EU) originates from historical cobbler measures like the barleycorn (1/3 inch) to determine <em>length only</em>. However, podiatric research shows that <strong>width and instep volume</strong> are the primary sources of shoe discomfort.
                </p>
                <p style="color: var(--color-text-muted); font-size: 14px; line-height: 1.7;">
                  By analyzing foot shape profiles, we map the **Length-to-Width Ratio** (Length / Width) to classify shoe last geometries:
                </p>
                <ul style="color: var(--color-text-muted); font-size: 14px; line-height: 1.8; padding-left: 20px; margin-top: 8px;">
                  <li><strong>Ratio &gt; 2.7</strong>: Narrow profile. Suits streamlined shoes (e.g. Nike, Puma).</li>
                  <li><strong>Ratio 2.4 to 2.7</strong>: Standard profile. Suits standard-last designs.</li>
                  <li><strong>Ratio 2.2 to 2.4</strong>: Wide profile. Requires wider toe boxes (e.g. New Balance, ASICS wide).</li>
                  <li><strong>Ratio &lt; 2.2</strong>: Extra Wide profile. Needs wide-last variations or stability shapes.</li>
                </ul>
              </div>

              <!-- Section 3 -->
              <div>
                <h3 style="font-size: 18px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <span>⚖️</span> Why BMI is Factored into Matching
                </h3>
                <p style="color: var(--color-text-muted); font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
                  Static foot scans represent the foot at rest. When standing, walking, or running, gravity pushes your body weight down through your feet, causing the **foot arch to flatten and splay outward**.
                </p>
                <p style="color: var(--color-text-muted); font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
                  Higher Body Mass Index (BMI) generates larger load forces, increasing the foot's width profile under load. To prevent shoes from pinching during active motion, our client-side matching engine applies a **dynamic load-bearing width offset**:
                </p>
                <div style="
                  background: rgba(255,255,255,0.03); 
                  border: 1px solid var(--color-border); 
                  border-radius: 8px; 
                  padding: 16px; 
                  display: grid; 
                  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
                  gap: 12px;
                  margin-top: 10px;
                ">
                  <div style="font-size: 13px; text-align: center;">
                    <div style="color: var(--color-text-muted);">Underweight (BMI &lt; 18.5)</div>
                    <div style="font-weight: 700; color: #81c784; margin-top: 4px;">-1.0mm target width</div>
                  </div>
                  <div style="font-size: 13px; text-align: center; border-left: 1px solid var(--color-border);">
                    <div style="color: var(--color-text-muted);">Normal (BMI 18.5-24.9)</div>
                    <div style="font-weight: 700; color: var(--color-text); margin-top: 4px;">0.0mm offset</div>
                  </div>
                  <div style="font-size: 13px; text-align: center; border-left: 1px solid var(--color-border);">
                    <div style="color: var(--color-text-muted);">Overweight (BMI 25-29.9)</div>
                    <div style="font-weight: 700; color: #ffb74d; margin-top: 4px;">+2.0mm width offset</div>
                  </div>
                  <div style="font-size: 13px; text-align: center; border-left: 1px solid var(--color-border);">
                    <div style="color: var(--color-text-muted);">Obese (BMI &ge; 30)</div>
                    <div style="font-weight: 700; color: #ff8a65; margin-top: 4px;">+4.5mm width offset</div>
                  </div>
                </div>
              </div>

            </div>

            <div style="margin-top: 40px; text-align: center; border-top: 1px solid var(--color-border); padding-top: 30px;">
              <button class="btn btn-primary" id="btn-about-back" style="padding: 10px 24px;">Back to Sizer</button>
            </div>

          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-about-back').addEventListener('click', () => {
      this.onBack();
    });
  }
}
