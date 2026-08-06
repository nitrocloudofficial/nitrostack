export class QuestionnaireView {
  constructor(measurement, onNext, onBack) {
    this.measurement = measurement;
    this.onNext = onNext;
    this.onBack = onBack;

    // Biomechanical Assessment State
    this.archType = 'flat_feet';
    this.treadWear = 'inner_edge';
    this.kneeAlignment = 'caves_in';
    this.heelStrike = 'heavy_heel';
    this.weightKg = 75;
    this.activityMultiplier = 2.5; // Running default
    this.use = 'Sports';
    this.budget = 'mid';
    this.gender = 'unisex';
  }

  get dynamicLoadKg() {
    return Math.round(this.weightKg * this.activityMultiplier);
  }

  get foamRecommendation() {
    const load = this.dynamicLoadKg;
    if (load > 210) {
      return {
        type: 'Firm to High-Density Foam (Firm EVA / TPU)',
        stack: 'High Stack (30mm+)',
        reason: 'Soft plush foam would collapse under heavier loads, destabilizing ankles.',
      };
    } else if (load >= 150) {
      return {
        type: 'Balanced Super Foam (Nitrogen-infused EVA)',
        stack: 'Medium-High Stack (25–32mm)',
        reason: 'Standard foam compresses correctly for energy return & cushioning.',
      };
    } else {
      return {
        type: 'Soft / Plush Super Foam (PEBA / Soft EVA)',
        stack: 'Medium-Low Stack (18–28mm)',
        reason: 'Prevents firm foams from feeling stiff & board-like under light weight.',
      };
    }
  }

  render(container) {
    container.innerHTML = `
      <div class="wizard-box animate-fade-in-up" style="max-width: 960px; margin: 0 auto; width: 100%;">
        <!-- Step Progress Bar -->
        <div class="step-indicator">
          <div class="step-node completed">1</div>
          <div class="step-node completed">2</div>
          <div class="step-node completed">3</div>
          <div class="step-node active">4</div>
          <div class="step-node">5</div>
        </div>

        <div class="glass-card" style="padding: 36px; border-radius: 28px;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <span style="background: rgba(250, 133, 90, 0.18); color: var(--color-coral); padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;">
              🩺 Orthopedic & Biomechanical Foot Assessment
            </span>
            <h2 style="font-size: 28px; font-weight: 900; color: var(--color-text); margin: 10px 0 8px 0;">
              Biomechanical Sizing & Arch Analysis
            </h2>
            <p style="color: var(--color-text-muted); font-size: 14px; margin: 0; max-width: 680px; margin: 0 auto;">
              Foot length (${this.measurement.length_mm} mm × ${this.measurement.width_mm} mm) calibrated! Complete these 3 biomechanical tests to find your optimal shoe structure.
            </p>
          </div>

          <!-- MODULE 1: WET FOOTPRINT & ARCH TYPE TEST -->
          <div style="background: rgba(255, 255, 255, 0.4); border: 1px solid var(--color-border); border-radius: 24px; padding: 24px; margin-bottom: 28px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">👣</span>
                <h3 style="font-size: 17px; font-weight: 800; color: var(--color-text); margin: 0;">
                  1. Wet Footprint & Arch Type Test
                </h3>
              </div>
              <span style="font-size: 12px; color: var(--color-coral); font-weight: 700;">Flat Foot Detection</span>
            </div>

            <!-- Visual Diagram Box for Wet Footprint Test -->
            <div style="
              background: #090d16; 
              border-radius: 18px; 
              padding: 16px; 
              display: flex; align-items: center; justify-content: space-around;
              margin-bottom: 20px;
              border: 1px stroke rgba(255, 255, 255, 0.1);
            ">
              <div style="text-align: center; color: #fff;">
                <svg width="60" height="75" viewBox="0 0 70 90">
                  <path d="M 25,10 C 40,5 55,15 50,35 C 45,55 52,70 48,80 C 40,88 25,88 20,80 C 15,65 15,40 25,10 Z" fill="#FA855A" opacity="0.9"/>
                </svg>
                <div style="font-size: 11px; font-weight: 800; color: #FA855A; margin-top: 4px;">Full Print</div>
                <div style="font-size: 10px; color: #94a3b8;">Flat Feet</div>
              </div>

              <div style="text-align: center; color: #fff;">
                <svg width="60" height="75" viewBox="0 0 70 90">
                  <path d="M 25,10 C 40,5 50,15 48,35 C 32,42 32,58 48,65 C 45,78 30,85 20,80 C 15,65 15,40 25,10 Z" fill="#62C4DA" opacity="0.9"/>
                </svg>
                <div style="font-size: 11px; font-weight: 800; color: #62C4DA; margin-top: 4px;">Curved Line</div>
                <div style="font-size: 10px; color: #94a3b8;">Neutral Arch</div>
              </div>

              <div style="text-align: center; color: #fff;">
                <svg width="60" height="75" viewBox="0 0 70 90">
                  <path d="M 25,10 C 40,5 50,15 48,30 C 25,38 25,60 48,70 C 45,78 30,85 20,80 C 15,65 15,40 25,10 Z" fill="#FFDE96" opacity="0.9"/>
                </svg>
                <div style="font-size: 11px; font-weight: 800; color: #FFDE96; margin-top: 4px;">Thin Band</div>
                <div style="font-size: 10px; color: #94a3b8;">High Arch</div>
              </div>
            </div>

            <!-- Interactive Choice Cards for Arch Test -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
              <div class="choice-card ${this.archType === 'flat_feet' ? 'selected' : ''}" data-type="arch" data-val="flat_feet">
                <div style="font-weight: 800; font-size: 15px; color: var(--color-coral);">Full Footprint (Flat Foot)</div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Can't slide finger under arch while standing. Inner tread wears fast.</div>
              </div>

              <div class="choice-card ${this.archType === 'neutral' ? 'selected' : ''}" data-type="arch" data-val="neutral">
                <div style="font-weight: 800; font-size: 15px; color: var(--color-skyblue);">Normal Curved Arch</div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Smooth inner curve on footprint. Uniform tread wear across sole.</div>
              </div>

              <div class="choice-card ${this.archType === 'high_arch' ? 'selected' : ''}" data-type="arch" data-val="high_arch">
                <div style="font-weight: 800; font-size: 15px; color: #d97706;">High Arch (Supination)</div>
                <div style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Thin outer connection. Outer edge of shoe sole wears out first.</div>
              </div>
            </div>
          </div>

          <!-- MODULE 2: SINGLE-LEG SQUAT & KNEE ALIGNMENT TEST (CLEAN GLASS CARDS) -->
          <div style="background: rgba(255, 255, 255, 0.4); border: 1px solid var(--color-border); border-radius: 24px; padding: 24px; margin-bottom: 28px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">🦵</span>
                <h3 style="font-size: 17px; font-weight: 800; color: var(--color-text); margin: 0;">
                  2. Single-Leg Squat Knee Stability Test
                </h3>
              </div>
              <span style="font-size: 12px; color: var(--color-skyblue); font-weight: 700;">Overpronation Check</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
              <div class="choice-card ${this.kneeAlignment === 'caves_in' ? 'selected' : ''}" data-type="knee" data-val="caves_in">
                <div style="font-size: 26px; margin-bottom: 6px;">↘️</div>
                <div style="font-weight: 800; font-size: 16px; color: var(--color-coral);">Knee Caves Inward (Valgus)</div>
                <div style="font-size: 13px; color: var(--color-text-muted); margin-top: 6px; line-height: 1.4;">
                  Stand on 1 leg and bend knee into a shallow squat. If your knee caves inward towards your big toe, you need a <strong>Firm/Stability Shoe</strong> with medial arch support to prevent ankle collapse.
                </div>
              </div>

              <div class="choice-card ${this.kneeAlignment === 'straight' ? 'selected' : ''}" data-type="knee" data-val="straight">
                <div style="font-size: 26px; margin-bottom: 6px;">⬇️</div>
                <div style="font-weight: 800; font-size: 16px; color: var(--color-skyblue);">Knee Stays Straight</div>
                <div style="font-size: 13px; color: var(--color-text-muted); margin-top: 6px; line-height: 1.4;">
                  Stand on 1 leg and bend knee into a shallow squat. If your knee tracks straight over your 2nd toe, you need a <strong>Neutral / Soft Cushioning Shoe</strong> allowing natural foot movement.
                </div>
              </div>
            </div>
          </div>

          <!-- MODULE 3: DYNAMIC WEIGHT LOAD & STACK HEIGHT CALCULATOR -->
          <div style="background: rgba(255, 255, 255, 0.4); border: 1px solid var(--color-border); border-radius: 24px; padding: 24px; margin-bottom: 32px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 22px;">⚖️</span>
                <h3 style="font-size: 17px; font-weight: 800; color: var(--color-text); margin: 0;">
                  3. Dynamic Weight Load & Foam Density Calculation
                </h3>
              </div>
              <span style="font-size: 12px; color: var(--color-tomato); font-weight: 700;">Formula: Body Weight × Impact</span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; align-items: center;">
              <div>
                <label style="font-size: 12px; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase;">
                  Your Body Weight (kg):
                </label>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
                  <input type="number" id="input-weight" value="${this.weightKg}" min="40" max="160" style="
                    background: rgba(255, 255, 255, 0.8);
                    border: 2px solid var(--color-border);
                    border-radius: 14px;
                    padding: 10px 16px;
                    font-size: 18px;
                    font-weight: 800;
                    width: 130px;
                    color: var(--color-text);
                  " />
                  <span style="font-size: 14px; color: var(--color-text-muted); font-weight: 600;">kg (~${Math.round(this.weightKg * 2.2)} lbs)</span>
                </div>

                <label style="font-size: 12px; font-weight: 800; color: var(--color-text-muted); text-transform: uppercase; display: block; margin-top: 16px;">
                  Primary Impact Level:
                </label>
                <select id="select-activity" style="
                  background: rgba(255, 255, 255, 0.8);
                  border: 2px solid var(--color-border);
                  border-radius: 14px;
                  padding: 10px 14px;
                  font-size: 14px;
                  font-weight: 700;
                  width: 100%;
                  margin-top: 6px;
                  color: var(--color-text);
                ">
                  <option value="1.25" ${this.activityMultiplier === 1.25 ? 'selected' : ''}>Walking / Daily Wear (1.25× Impact)</option>
                  <option value="2.5" ${this.activityMultiplier === 2.5 ? 'selected' : ''}>Running / Jogging (2.5× Impact)</option>
                  <option value="4.0" ${this.activityMultiplier === 4.0 ? 'selected' : ''}>Jumping / High Impact (4.0× Impact)</option>
                </select>
              </div>

              <!-- Live Calculated Result Card -->
              <div id="dynamic-load-card" style="
                background: linear-gradient(135deg, #121c22 0%, #1a262e 100%);
                color: #ffffff;
                border-radius: 20px;
                padding: 20px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15);
              ">
                <div style="font-size: 11px; font-weight: 800; color: #62C4DA; text-transform: uppercase; letter-spacing: 0.05em;">
                  ⚡ Calculated Dynamic Impact Load
                </div>
                <div style="font-size: 32px; font-weight: 900; color: #FA855A; margin: 4px 0;">
                  <span id="display-load">${this.dynamicLoadKg}</span> kg
                </div>
                <div style="font-size: 13px; font-weight: 700; color: #FFDE96; margin-bottom: 6px;" id="display-foam-title">
                  ${this.foamRecommendation.type}
                </div>
                <div style="font-size: 11px; color: #a4b8c4; line-height: 1.4;" id="display-foam-reason">
                  ${this.foamRecommendation.reason}
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--color-border); padding-top: 24px;">
            <button class="btn btn-secondary" id="btn-q-back" style="padding: 12px 24px;">
              &larr; Back
            </button>
            <button class="btn btn-primary" id="btn-q-submit" style="
              padding: 14px 36px; 
              border-radius: 16px; 
              font-size: 16px; 
              font-weight: 800;
              background: var(--grad-accent);
              box-shadow: 0 6px 20px rgba(250, 133, 90, 0.35);
            ">
              ⚡ Calculate Biomechanical Sizing & Launch Fit Studio &rarr;
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    // Card Selection Click Handlers
    container.querySelectorAll('.choice-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const type = e.currentTarget.getAttribute('data-type');
        const val = e.currentTarget.getAttribute('data-val');

        if (type === 'arch') this.archType = val;
        if (type === 'knee') this.kneeAlignment = val;

        container.querySelectorAll(`.choice-card[data-type="${type}"]`).forEach((c) => c.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
      });
    });

    const weightInput = container.querySelector('#input-weight');
    const activitySelect = container.querySelector('#select-activity');

    const updateCalculatedLoad = () => {
      this.weightKg = parseInt(weightInput.value, 10) || 75;
      this.activityMultiplier = parseFloat(activitySelect.value) || 2.5;

      const loadEl = container.querySelector('#display-load');
      const foamTitleEl = container.querySelector('#display-foam-title');
      const foamReasonEl = container.querySelector('#display-foam-reason');

      if (loadEl) loadEl.textContent = this.dynamicLoadKg;
      if (foamTitleEl) foamTitleEl.textContent = this.foamRecommendation.type;
      if (foamReasonEl) foamReasonEl.textContent = this.foamRecommendation.reason;
    };

    weightInput?.addEventListener('input', updateCalculatedLoad);
    activitySelect?.addEventListener('change', updateCalculatedLoad);

    document.getElementById('btn-q-back')?.addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    document.getElementById('btn-q-submit')?.addEventListener('click', () => {
      const payload = {
        foot: {
          foot_length: this.measurement.length_mm,
          forefoot_width: this.measurement.width_mm,
          heel_width: this.measurement.heel_width || Math.round(this.measurement.width_mm * 0.63),
          scan_confidence: this.measurement.confidence || 0.94,
        },
        functional: {
          stability_level: this.kneeAlignment === 'caves_in' ? 0.9 : 0.7,
          balance_level: 0.8,
          standing_hours: 6,
          activity: this.activityMultiplier >= 2.5 ? 'Sports' : 'Casual',
        },
        profile: {
          height: 175,
          weight: this.weightKg,
          age: 28,
          budget_inr: 16000,
          comfort_preference: 'Balanced',
        },
        medical: {
          diabetes: false,
          plantar_fasciitis: false,
          bunion: false,
          flat_feet: this.archType === 'flat_feet',
          past_injury: false,
        },
        biomechanical: {
          arch_type: this.archType,
          tread_wear_test: this.treadWear,
          knee_alignment: this.kneeAlignment,
          heel_strike: this.heelStrike,
          dynamic_load_kg: this.dynamicLoadKg,
        },
        gender: this.gender,
      };

      this.onNext(payload);
    });
  }
}
