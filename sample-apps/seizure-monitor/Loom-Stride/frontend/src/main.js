import { HeaderComponent } from './components/header.js';
import { LandingView } from './views/landing.js';
import { CoinSelectView } from './views/coin-select.js';
import { CaptureView } from './views/capture.js';
import { MeasurementView } from './views/measurement.js';
import { QuestionnaireView } from './views/questionnaire.js';
import { ShoesView } from './views/shoes.js';
import { AboutView } from './views/about.js';
import { SettingsView } from './views/settings.js';
import { floatingFacts } from './components/floating-facts.js';

class App {
  constructor() {
    this.container = null;
    this.header = new HeaderComponent(this);

    // Application state
    this.currentView = 'landing';
    this.selectedCoinId = 'inr_10';
    this.photo = null;
    this.measurementResult = null;
    this.fitWisePayload = null;
    this.searchQuery = null;
  }

  init() {
    const appEl = document.getElementById('app');
    appEl.innerHTML = `
      <div id="header-root"></div>

      <!-- Dashboard Layout with 24px-Radius Left Sidebar -->
      <div class="container" style="flex: 1; display: flex; gap: 24px; padding-top: 32px; padding-bottom: 60px;">
        <!-- Left Sidebar Glass Panel -->
        <aside class="glass-sidebar" style="height: fit-content;">
          <a class="sidebar-nav-item active" id="nav-home" href="#landing">
            <span>🏠</span> Home
          </a>
          <a class="sidebar-nav-item" id="nav-studio" href="#coin-select">
            <span>👟</span> Fit Studio
          </a>
          <a class="sidebar-nav-item" id="nav-analytics" href="#about">
            <span>💡</span> Know How
          </a>
          <a class="sidebar-nav-item" id="nav-settings" href="#settings">
            <span>⚙️</span> Settings
          </a>
        </aside>

        <!-- Main Content Area -->
        <main style="flex: 1; min-width: 0;" id="main-content"></main>
      </div>

      <footer style="
        text-align: center;
        padding: 24px 20px;
        color: var(--color-text-muted);
        font-size: 13px;
        border-top: 1px solid var(--color-border);
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(12px);
      ">
        &copy; 2026 Loom&Stride AI. Powered by SneaksAPI & TOPSIS Multi-Criteria Decision Engine.
      </footer>
    `;

    this.container = document.getElementById('main-content');

    document.getElementById('header-root').innerHTML = this.header.render();
    this.header.init();
    floatingFacts.init();

    window.addEventListener('hashchange', () => this.route());
    this.route();
  }

  navigate(viewName) {
    this.currentView = viewName;
    window.location.hash = viewName;
  }

  updateSidebar(viewName) {
    document.querySelectorAll('.sidebar-nav-item').forEach((item) => item.classList.remove('active'));
    if (viewName === 'landing') document.getElementById('nav-home')?.classList.add('active');
    else if (['coin-select', 'capture', 'measurement', 'questionnaire', 'shoes'].includes(viewName))
      document.getElementById('nav-studio')?.classList.add('active');
    else if (viewName === 'about') document.getElementById('nav-analytics')?.classList.add('active');
    else if (viewName === 'settings') document.getElementById('nav-settings')?.classList.add('active');
  }

  getFallbackPayload() {
    return {
      foot: { foot_length: 260, forefoot_width: 100, heel_width: 65, toe_shape: 'Egyptian', hallux_angle: 5, scan_confidence: 98 },
      functional: { stability_level: 0.8, balance_level: 0.8, standing_hours: 6, activity: 'Running' },
      profile: { height: 175, weight: 70, age: 25, comfort_preference: 'Balanced' },
      medical: { diabetes: false, plantar_fasciitis: false, bunion: false, flat_feet: false, past_injury: false },
      biomechanical: { arch_type: 'neutral', footprint_test: 'curved', tread_wear_test: 'uniform', knee_alignment: 'straight', heel_strike: 'heavy_heel', dynamic_load_kg: 87.5 },
      gender: 'men',
    };
  }

  route() {
    const hash = window.location.hash.slice(1) || 'landing';
    this.currentView = hash;
    this.updateSidebar(hash);

    switch (hash) {
      case 'landing':
        this.selectedCoinId = 'inr_10';
        this.photo = null;
        this.measurementResult = null;
        this.fitWisePayload = null;
        new LandingView(() => {
          this.navigate('coin-select');
        }).render(this.container);
        break;

      case 'coin-select':
        new CoinSelectView(
          (coinId) => {
            this.selectedCoinId = coinId;
            this.navigate('capture');
          },
          () => this.navigate('landing')
        ).render(this.container);
        break;

      case 'capture':
        new CaptureView(
          this.selectedCoinId,
          (photo) => {
            this.photo = photo;
            this.navigate('measurement');
          },
          () => this.navigate('coin-select')
        ).render(this.container);
        break;

      case 'measurement':
        if (!this.photo) {
          // Provide fallback image if user navigated directly
          this.photo = '/images/ghibli-hero.png';
        }
        new MeasurementView(
          this.selectedCoinId,
          this.photo,
          (result) => {
            this.measurementResult = result;
            this.navigate('questionnaire');
          },
          () => this.navigate('capture')
        ).render(this.container);
        break;

      case 'questionnaire':
        if (!this.measurementResult) {
          this.measurementResult = { foot_length: 260, forefoot_width: 100, ratio: 2.6, confidence: 98 };
        }
        new QuestionnaireView(
          this.measurementResult,
          (payload) => {
            this.fitWisePayload = payload;
            this.navigate('shoes');
          },
          () => this.navigate('measurement')
        ).render(this.container);
        break;

      case 'shoes':
        if (!this.fitWisePayload) {
          this.fitWisePayload = this.getFallbackPayload();
        }
        const shoesView = new ShoesView(
          this.fitWisePayload,
          () => this.navigate('questionnaire')
        );
        shoesView.render(this.container);

        if (this.searchQuery) {
          const q = this.searchQuery;
          this.searchQuery = null;
          shoesView.loadFitWiseRecommendations(this.container, q);
        }
        break;

      case 'about':
        new AboutView(() => window.history.back()).render(this.container);
        break;

      case 'settings':
        new SettingsView().render(this.container);
        break;

      default:
        this.navigate('landing');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
