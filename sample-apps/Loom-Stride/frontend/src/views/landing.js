export class LandingView {
  constructor(onStart) {
    this.onStart = onStart;
  }

  render(container) {
    container.innerHTML = `
      <div class="animate-fade-in-up" style="display: flex; flex-direction: column; gap: 32px; width: 100%;">
        
        <!-- Hero Header -->
        <div class="glass-card" style="
          padding: 38px 32px; 
          text-align: center; 
          background: linear-gradient(135deg, rgba(246, 255, 234, 0.75) 0%, rgba(255, 222, 150, 0.45) 50%, rgba(250, 133, 90, 0.3) 100%);
          border: 1px solid var(--color-border);
          position: relative;
          overflow: hidden;
          border-radius: 28px;
        ">
          <span style="
            background: rgba(250, 133, 90, 0.18); 
            color: var(--color-coral); 
            padding: 6px 16px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 0.08em;
          ">
            ✨ Loom&Stride AI Sizing Engine
          </span>

          <h1 style="
            font-size: 38px; 
            font-weight: 900; 
            color: var(--color-text); 
            margin: 12px 0 10px 0; 
            line-height: 1.25;
          ">
            Perfect Shoe Sizing.<br/>
            <span style="background: linear-gradient(135deg, #FA855A 0%, #C93638 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              Measured to the Millimeter.
            </span>
          </h1>

          <p style="
            color: var(--color-text-muted); 
            font-size: 15px; 
            max-width: 680px; 
            margin: 0 auto 24px auto; 
            line-height: 1.6;
          ">
            Say goodbye to size guessing and returns. One top-down photo with a coin calibrates your exact foot length, width, and ratio against 10+ major sneaker brands.
          </p>

          <div style="display: flex; justify-content: center; gap: 16px;">
            <button class="btn btn-primary pulse-glow-active" id="btn-start-scan" style="
              padding: 14px 36px; 
              font-size: 16px; 
              font-weight: 800; 
              border-radius: 18px;
              background: var(--grad-accent);
              box-shadow: 0 8px 24px rgba(250, 133, 90, 0.35);
            ">
              ⚡ Start 3D Foot Scan &rarr;
            </button>
          </div>
        </div>

        <!-- THREE QUIET STEPS SHOWCASE SECTION (Strictly Aligned on Same Line) -->
        <div style="width: 100%;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="font-size: 26px; font-weight: 900; color: var(--color-text); margin-bottom: 4px;">
              Three Quiet Steps
            </h2>
            <p style="color: var(--color-text-muted); font-size: 14px; margin: 0;">
              How ShoeFit turns a simple photo into sub-millimeter sneaker accuracy
            </p>
          </div>

          <!-- 3-Column Grid Strictly on the Same Horizontal Line -->
          <div style="
            display: grid; 
            grid-template-columns: repeat(3, 1fr); 
            gap: 20px; 
            width: 100%;
          ">
            
            <!-- STEP 01 -->
            <div class="glass-card" style="
              padding: 20px; 
              display: flex; 
              flex-direction: column; 
              gap: 14px;
              position: relative;
              border-radius: 24px;
              height: 100%;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="
                  font-size: 28px; 
                  font-weight: 900; 
                  color: var(--color-coral);
                  letter-spacing: -0.04em;
                ">01</span>
                <span style="
                  background: rgba(255, 222, 150, 0.4); 
                  color: #d97706; 
                  padding: 4px 12px; 
                  border-radius: 12px; 
                  font-size: 11px; 
                  font-weight: 800;
                ">
                  The Scale
                </span>
              </div>

              <!-- Animated Image 1: Foot on paper with coin -->
              <div style="
                border-radius: 16px; 
                overflow: hidden; 
                height: 180px; 
                position: relative;
                box-shadow: var(--shadow-sm);
                border: 1px stroke var(--color-border);
              ">
                <div class="laser-sweep-line"></div>
                <img src="/images/ghibli-hero.png" alt="Bare foot with coin ruler on paper" style="
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover;
                " />
              </div>

              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin-bottom: 6px;">
                  Lay down a coin
                </h3>
                <p style="color: var(--color-text-muted); font-size: 13px; line-height: 1.5; margin: 0;">
                  Bare foot on a light floor, a standard coin flat beside it on the same plane. The coin becomes the ruler.
                </p>
              </div>
            </div>

            <!-- STEP 02 -->
            <div class="glass-card" style="
              padding: 20px; 
              display: flex; 
              flex-direction: column; 
              gap: 14px;
              position: relative;
              border-radius: 24px;
              height: 100%;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="
                  font-size: 28px; 
                  font-weight: 900; 
                  color: var(--color-skyblue);
                  letter-spacing: -0.04em;
                ">02</span>
                <span style="
                  background: rgba(98, 196, 218, 0.25); 
                  color: #0284c7; 
                  padding: 4px 12px; 
                  border-radius: 12px; 
                  font-size: 11px; 
                  font-weight: 800;
                ">
                  The Capture
                </span>
              </div>

              <!-- Animated Image 2: Ghibli Smartphone Overhead Scan -->
              <div style="
                border-radius: 16px; 
                overflow: hidden; 
                height: 180px; 
                position: relative;
                box-shadow: var(--shadow-sm);
                border: 1px stroke var(--color-border);
              ">
                <div class="laser-sweep-line" style="animation-delay: 0.8s;"></div>
                <img src="/images/ghibli-scan.png" alt="Ghibli smartphone foot scanning illustration" style="
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover;
                " />
              </div>

              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin-bottom: 6px;">
                  Shoot straight down
                </h3>
                <p style="color: var(--color-text-muted); font-size: 13px; line-height: 1.5; margin: 0;">
                  One overhead photo. ShoeFit finds the coin, solves the pixel-to-millimetre scale and traces your outline.
                </p>
              </div>
            </div>

            <!-- STEP 03 -->
            <div class="glass-card" style="
              padding: 20px; 
              display: flex; 
              flex-direction: column; 
              gap: 14px;
              position: relative;
              border-radius: 24px;
              height: 100%;
            ">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="
                  font-size: 28px; 
                  font-weight: 900; 
                  color: var(--color-tomato);
                  letter-spacing: -0.04em;
                ">03</span>
                <span style="
                  background: rgba(201, 54, 56, 0.18); 
                  color: #C93638; 
                  padding: 4px 12px; 
                  border-radius: 12px; 
                  font-size: 11px; 
                  font-weight: 800;
                ">
                  The Matching
                </span>
              </div>

              <!-- Animated Image 3: Floating Sneakers Artwork -->
              <div style="
                border-radius: 16px; 
                overflow: hidden; 
                height: 180px; 
                position: relative;
                box-shadow: var(--shadow-sm);
                border: 1px stroke var(--color-border);
              ">
                <div class="laser-sweep-line" style="animation-delay: 1.6s;"></div>
                <img src="/images/ghibli-about.png" alt="Floating sneaker collection artwork" style="
                  width: 100%; 
                  height: 100%; 
                  object-fit: cover;
                " />
              </div>

              <div>
                <h3 style="font-size: 18px; font-weight: 800; color: var(--color-text); margin-bottom: 6px;">
                  Get matched, not guessed
                </h3>
                <p style="color: var(--color-text-muted); font-size: 13px; line-height: 1.5; margin: 0;">
                  Length, width and length ÷ width ratio are compared to real last shapes across ten brand size charts.
                </p>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;

    document.getElementById('btn-start-scan')?.addEventListener('click', () => {
      if (this.onStart) this.onStart();
    });
  }
}
