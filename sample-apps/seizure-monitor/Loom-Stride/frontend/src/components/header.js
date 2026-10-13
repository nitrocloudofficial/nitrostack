import { showToast } from './toast.js';

export class HeaderComponent {
  constructor(app) {
    this.app = app;
  }

  render() {
    return `
      <header class="navbar">
        <div class="container navbar-inner">
          <!-- Logo -->
          <a href="#landing" class="logo">
            <span style="font-size: 26px;">👟</span>
            <span style="font-weight: 900; background: linear-gradient(135deg, #FA855A 0%, #C93638 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Loom&Stride</span>
            <span style="font-size: 11px; font-weight: 800; background: rgba(98, 196, 218, 0.2); color: #62C4DA; padding: 2px 8px; border-radius: 12px; border: 1px solid rgba(98, 196, 218, 0.4);">
              AI 2.0
            </span>
          </a>

          <!-- Glass Pill Search Bar -->
          <div class="glass-search-pill" style="position: relative;">
            <span style="color: #62C4DA; font-size: 15px;">🔍</span>
            <input type="text" id="global-search-input" placeholder="Search live sneakers, brands (Yeezy, Nike, Decathlon)..." />
          </div>

          <!-- Top Right Controls: Theme Toggle -->
          <div style="display: flex; align-items: center; gap: 12px;">
            <!-- Theme Toggle -->
            <button id="theme-toggle" style="
              background: rgba(255, 255, 255, 0.5); 
              border: 1px solid var(--color-border); 
              padding: 8px 12px; 
              border-radius: 20px; 
              cursor: pointer; 
              font-size: 14px;
              display: flex; align-items: center; gap: 6px;
              color: var(--color-text-muted);
            ">
              <span id="theme-icon">🌙</span>
            </button>
          </div>
        </div>

        <div id="header-modal-root"></div>
      </header>
    `;
  }

  init() {
    const toggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const searchInput = document.getElementById('global-search-input');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        if (themeIcon) {
          themeIcon.textContent = isDark ? '☀️' : '🌙';
        }
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const query = searchInput.value.trim();
          if (query) {
            window.appSearchQuery = query;
            this.app.searchQuery = query;
            this.app.navigate('shoes');
          } else {
            window.appSearchQuery = null;
          }
        }
      });
    }
  }
}
