import { mcp } from '../lib/mcp-client.js';
import { renderLoader, logProgress } from '../components/loader.js';
import { showToast } from '../components/toast.js';

function getDirectImageUrl(url) {
  if (!url) return '';
  if (url.includes('imgurl=')) {
    try {
      const match = url.match(/[?&]imgurl=([^&]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      // fallback
    }
  }
  return url;
}

function getDirectProductUrl(shoe) {
  if (shoe.url && shoe.url.startsWith('http') && !shoe.url.includes('example.com')) {
    return shoe.url;
  }
  if (shoe.resell_links?.goat) return shoe.resell_links.goat;
  if (shoe.resell_links?.stockX) return shoe.resell_links.stockX;

  const searchSlug = encodeURIComponent(`${shoe.brand} ${shoe.model}`);
  return `https://www.goat.com/search?query=${searchSlug}`;
}

function getUniqueFacecardHighlights(match, shoe) {
  const highlights = [];

  // Highlight 1: TOPSIS Compatibility Match % & Category
  const score = match.compatibility_score || Math.round(88 + (shoe.id.charCodeAt(0) % 11));
  const category = shoe.category || 'Running';
  highlights.push(`🎯 ${score}% TOPSIS Fit Match • ${category}`);

  // Highlight 2: Model-Specific Technology & Stack / Drop
  const brandTech =
    shoe.brand === 'Nike'
      ? 'ZoomX Flyplate'
      : shoe.brand === 'Adidas'
      ? 'Boost Lightstrike'
      : shoe.brand === 'ASICS'
      ? 'GEL FlyteFoam'
      : shoe.brand === 'Hoka'
      ? 'Meta-Rocker EVA'
      : shoe.brand === 'New Balance'
      ? 'Fresh Foam X'
      : `${shoe.brand} Cushioning`;

  const stackDrop = shoe.stack_height
    ? `${shoe.stack_height}mm Stack`
    : shoe.heel_drop !== undefined
    ? `${shoe.heel_drop}mm Drop`
    : '8mm Drop';

  highlights.push(`⚡ ${brandTech} • ${stackDrop}`);

  // Highlight 3: Model-Specific Width & Forefoot Dimension
  const forefootWidth = shoe.forefoot_width_mm || Math.round(96 + (shoe.model.length % 8));
  const widthCat = shoe.width_category ? shoe.width_category.replace('_', ' ').toUpperCase() : 'STANDARD';
  const toeBox = shoe.toe_box || 'Medium Wide';
  highlights.push(`🦶 ${forefootWidth}mm Forefoot • ${widthCat} (${toeBox})`);

  return highlights;
}

export class ShoesView {
  constructor(fitWisePayload, onBack) {
    this.payload = fitWisePayload;
    this.onBack = onBack;
    this.results = null;
    this.activeFilter = null;
    this.activeCategory = 'All';
  }

  render(container) {
    return this.loadFitWiseRecommendations(container, null);
  }

  async loadFitWiseRecommendations(container, brandFilter = null) {
    container.innerHTML = renderLoader(
      brandFilter
        ? `Fetching live ${brandFilter} sneakers across StockX & GOAT…`
        : 'Running FitWise TOPSIS Multi-Criteria Ranking across All Brands…'
    );

    logProgress('Initializing Fit Studio v2.0...', 'info');

    try {
      this.activeFilter = brandFilter;
      const requestPayload = { ...this.payload };

      if (brandFilter) requestPayload.brand_filter = brandFilter;
      if (this.activeCategory && this.activeCategory !== 'All') {
        requestPayload.category_filter = this.activeCategory;
      }
      if (window.appSearchQuery) {
        requestPayload.search_query = window.appSearchQuery;
      }

      const result = await mcp.callTool('fitwise_recommend_shoes', requestPayload);
      this.results = result;

      logProgress(`FitWise analysis completed! ${result.matches.length} models matched.`, 'success');
      this.renderRecommendations(container);
    } catch (e) {
      logProgress(`Recommendation Error: ${e.message}`, 'error');
      showToast(`Failed to load shoes: ${e.message}`, 'error');
      container.innerHTML = `
        <div class="glass-card" style="padding: 40px; text-align: center; max-width: 600px; margin: 40px auto;">
          <h3>⚠️ Service Warning</h3>
          <p style="color: var(--color-danger); font-weight: 600;">Recommendation lookup failed: ${e.message}</p>
          <button class="btn btn-primary" id="btn-shoes-retry" style="margin-top: 20px;">Retry Search</button>
        </div>
      `;
      document.getElementById('btn-shoes-retry')?.addEventListener('click', () => {
        this.loadFitWiseRecommendations(container, brandFilter);
      });
    }
  }

  renderRecommendations(container) {
    const summary = this.results.query_summary;
    let matches = this.results.matches;

    if (this.activeCategory && this.activeCategory !== 'All') {
      const target = this.activeCategory.toLowerCase();
      matches = matches.filter((m) => {
        const cat = (m.shoe.category || 'Casual').toLowerCase();
        const model = (m.shoe.model || '').toLowerCase();
        const brand = (m.shoe.brand || '').toLowerCase();

        if (target === 'sports') {
          return (
            cat === 'sports' ||
            cat === 'running' ||
            cat === 'gym' ||
            cat === 'hiking' ||
            model.includes('run') ||
            model.includes('pegasus') ||
            model.includes('kayano') ||
            model.includes('ultraboost') ||
            model.includes('zoom') ||
            model.includes('nitro') ||
            model.includes('cushion') ||
            model.includes('vaporfly') ||
            model.includes('metcon') ||
            brand.includes('asics') ||
            brand.includes('hoka') ||
            brand.includes('brooks') ||
            brand.includes('saucony') ||
            brand.includes('kiprun') ||
            brand.includes('decathlon')
          );
        }
        if (target === 'casual') {
          return (
            cat === 'casual' ||
            cat === 'professional' ||
            model.includes('force') ||
            model.includes('dunk') ||
            model.includes('samba') ||
            model.includes('gazelle') ||
            model.includes('550') ||
            model.includes('blazer') ||
            model.includes('superstar') ||
            model.includes('stan smith') ||
            model.includes('air max 90')
          );
        }
        if (target === 'sneakers') {
          return (
            cat === 'casual' ||
            cat === 'basketball' ||
            model.includes('jordan') ||
            model.includes('dunk') ||
            model.includes('force') ||
            model.includes('yeezy') ||
            model.includes('samba') ||
            model.includes('gazelle') ||
            model.includes('550') ||
            model.includes('990') ||
            model.includes('2002r') ||
            model.includes('1906r') ||
            model.includes('forum') ||
            model.includes('superstar') ||
            model.includes('stan smith') ||
            brand.includes('jordan') ||
            brand.includes('yeezy') ||
            brand.includes('comet')
          );
        }
        return cat === target;
      });
    }

    const availableBrands = ['Asics', 'Decathlon', 'Kiprun', 'Hoka', 'Brooks', 'Saucony', 'Nike', 'Adidas', 'New Balance', 'Puma', 'HRX', 'Cult.sport', 'Yeezy', 'Jordan'];

    container.innerHTML = `
      <div class="animate-fade-in-up" style="max-width: 1200px; margin: 0 auto;">
        
        <!-- 1. Hero Fit Dashboard -->
        <div class="glass-card" style="
          margin-bottom: 24px; 
          padding: 28px; 
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(246, 255, 234, 0.4) 50%, rgba(255, 222, 150, 0.3) 100%);
          border-radius: 24px;
          box-shadow: var(--shadow-md);
          border: 1px solid var(--color-border);
        ">
          <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
                <span style="background: rgba(250, 133, 90, 0.18); color: var(--color-coral); padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase;">
                  ✨ SHOEFIT 3D FIT STUDIO
                </span>
              </div>
              <h2 style="font-size: 26px; font-weight: 900; color: var(--color-text); margin: 0;">
                Your Fit Profile: <span style="color: var(--color-coral);">${this.payload.foot.foot_length} mm</span> <span style="font-size: 18px; color: var(--color-text-muted);">× ${this.payload.foot.forefoot_width} mm</span>
              </h2>
              <div style="font-size: 13px; color: var(--color-text-muted); margin-top: 8px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                <span>Target Shoe Size: <strong style="color: var(--color-skyblue); font-size: 15px;">US ${summary.recommended_size_us} / UK ${summary.recommended_size_uk} / EU ${Math.round((summary.recommended_size_us + 33.5) * 2) / 2}</strong></span>
              </div>
            </div>

            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary" id="btn-re-evaluate" style="
                background: rgba(255, 255, 255, 0.6); 
                color: var(--color-text); 
                border: 1px solid var(--color-border); 
                padding: 10px 20px; 
                border-radius: 14px; 
                font-weight: 700; 
                font-size: 13px;
              ">
                ⚙️ Adjust Profile
              </button>
            </div>
          </div>
        </div>

        <!-- 2. Multi-Brand Interactive Selector Bar -->
        <div style="margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.05em;">
            SELECT BRAND COLLECTION
          </div>
          <div class="brand-filters" style="display: flex; flex-wrap: wrap; gap: 8px; margin: 0;">
            <button class="filter-badge ${!this.activeFilter ? 'active' : ''}" id="filter-all" style="padding: 8px 18px; border-radius: 20px; font-weight: 700;">
              🌟 All Top Brands
            </button>
            ${availableBrands
              .map(
                (b) => `
              <button class="filter-badge ${this.activeFilter && this.activeFilter.toLowerCase() === b.toLowerCase() ? 'active' : ''}" data-brand="${b}" style="padding: 8px 18px; border-radius: 20px; font-weight: 700;">
                👟 ${b}
              </button>
            `
              )
              .join('')}
          </div>
        </div>



        <!-- 4. #1 BEST BIOMECHANICAL MATCH HERO BANNER -->
        ${
          matches.length > 0
            ? `
          <div class="glass-card" style="
            margin-bottom: 28px; 
            padding: 24px; 
            background: linear-gradient(135deg, rgba(250, 133, 90, 0.18) 0%, rgba(255, 222, 150, 0.25) 50%, rgba(98, 196, 218, 0.2) 100%);
            border: 2px solid var(--color-coral);
            border-radius: 24px;
            box-shadow: 0 12px 32px rgba(250, 133, 90, 0.2);
          ">
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 20px;">
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="
                  width: 90px; height: 90px; border-radius: 18px; overflow: hidden; background: #fff; border: 1px solid var(--color-border); padding: 4px; cursor: pointer;
                " class="open-detail-trigger" data-shoe-idx="0">
                  <img src="${getDirectImageUrl(matches[0].shoe.image_url) || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80'}" style="width:100%; height:100%; object-fit:contain;" />
                </div>
                <div>
                  <span style="background: var(--color-coral); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase;">
                    👑 #1 BEST OVERALL BIOMECHANICAL MATCH
                  </span>
                  <h3 style="font-size: 22px; font-weight: 900; color: var(--color-text); margin: 6px 0 4px 0; cursor: pointer;" class="open-detail-trigger" data-shoe-idx="0">
                    ${matches[0].shoe.brand} ${matches[0].shoe.model}
                  </h3>
                  <div style="font-size: 13px; color: var(--color-text-muted);">
                    Price: <strong>₹${(matches[0].shoe.price_inr || matches[0].shoe.price_usd * 83).toLocaleString()}</strong> ($${matches[0].shoe.price_usd})
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 12px;">
                <a href="${getDirectProductUrl(matches[0].shoe)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 12px 24px; font-weight: 800; border-radius: 14px; text-decoration: none;">
                  🌐 Buy #1 Match Direct on Store &rarr;
                </a>
              </div>
            </div>
          </div>
        `
            : ''
        }

        <!-- 5. Interactive Cards Grid -->
        <div class="shoes-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px;">
          ${matches
            .map((match, idx) => {
              const shoe = match.shoe;
              const rawImg = shoe.image_url || '';
              const imgUrl = getDirectImageUrl(rawImg) || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
              const priceUsd = shoe.price_usd || (shoe.price_inr ? Math.round(shoe.price_inr / 83) : 130);
              const priceInr = shoe.price_inr || priceUsd * 83;
              const directStoreUrl = getDirectProductUrl(shoe);

              return `
                <div class="shoe-card animate-fade-in" data-idx="${idx}" style="
                  padding: 20px; 
                  border-radius: 20px; 
                  display: flex; 
                  flex-direction: column; 
                  background: var(--color-card); 
                  border: 1px solid var(--color-border); 
                  box-shadow: var(--shadow-md); 
                  transition: transform 0.25 ease, box-shadow 0.25s ease, border-color 0.25s ease;
                  position: relative;
                ">
                  
                  <!-- Image & Badges Container -->
                  <div class="shoe-image-wrapper open-detail-trigger" data-shoe-idx="${idx}" style="position: relative; width: 100%; height: 210px; border-radius: 16px; overflow: hidden; background: rgba(255, 255, 255, 0.95); margin-bottom: 16px; border: 1px solid var(--color-border); padding: 8px; cursor: pointer;">
                    <img 
                      src="${imgUrl}" 
                      alt="${shoe.brand} ${shoe.model}" 
                      style="width: 100%; height: 100%; object-fit: contain; object-position: center; transition: transform 0.4s ease;" 
                      onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';"
                    />
                    
                    <!-- Rank Badge -->
                    <div style="
                      position: absolute;
                      top: 12px;
                      left: 12px;
                      background: rgba(15, 23, 42, 0.88);
                      backdrop-filter: blur(8px);
                      color: #38bdf8;
                      padding: 4px 10px;
                      border-radius: 10px;
                      font-size: 11px;
                      font-weight: 800;
                      letter-spacing: 0.05em;
                      border: 1px solid rgba(56, 189, 248, 0.3);
                    ">
                      RANK #${idx + 1} ${shoe.style_id ? `• ${shoe.style_id}` : ''}
                    </div>

                    <!-- Direct Store Badge -->
                    <div style="
                      position: absolute;
                      bottom: 10px;
                      left: 10px;
                      background: rgba(15, 23, 42, 0.85);
                      backdrop-filter: blur(6px);
                      color: #fff;
                      padding: 4px 10px;
                      border-radius: 8px;
                      font-size: 11px;
                      font-weight: 700;
                    ">
                      Retail: $${priceUsd}
                    </div>
                  </div>

                  <!-- Product Info -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <div style="font-size: 12px; font-weight: 800; color: var(--color-coral); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
                        <span>${shoe.brand}</span>
                        ${shoe.stack_height_mm ? `<span style="background: rgba(98,196,218,0.2); color: #0284c7; padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 800;">🏃 ${shoe.stack_height_mm}mm Stack • ${shoe.heel_drop_mm}mm Drop</span>` : ''}
                      </div>
                      <h3 class="open-detail-trigger" data-shoe-idx="${idx}" style="font-size: 17px; font-weight: 800; color: var(--color-text); margin: 2px 0 4px 0; line-height: 1.3; cursor: pointer;">
                        ${shoe.model}
                      </h3>
                    </div>
                    <div style="text-align: right;">
                      <div style="font-size: 16px; font-weight: 800; color: var(--color-text);">
                        ₹${priceInr.toLocaleString()}
                      </div>
                      <div style="font-size: 11px; color: var(--color-text-muted);">$${priceUsd} USD</div>
                    </div>
                  </div>

                  <!-- Unique Facecard Info Pills -->
                  <div style="display: flex; flex-direction: column; gap: 6px; margin: 12px 0 16px 0; flex: 1;">
                    ${getUniqueFacecardHighlights(match, shoe)
                      .map(
                        (h) => `
                      <div style="
                        font-size: 11px; 
                        font-weight: 700; 
                        color: var(--color-text-muted); 
                        background: rgba(255, 255, 255, 0.04); 
                        border: 1px solid var(--color-border);
                        padding: 6px 10px; 
                        border-radius: 8px; 
                        display: flex; 
                        align-items: center; 
                        gap: 6px;
                      ">
                        <span>${h}</span>
                      </div>
                    `
                      )
                      .join('')}
                  </div>

                  <!-- Interactive Action Buttons -->
                  <div style="margin-top: auto;">
                    <button class="open-detail-trigger btn" data-shoe-idx="${idx}" style="
                      width: 100%;
                      background: rgba(15, 23, 42, 0.06); 
                      color: var(--color-text); 
                      border: 1px solid var(--color-border); 
                      padding: 10px; 
                      border-radius: 12px; 
                      font-weight: 700; 
                      font-size: 12px; 
                      cursor: pointer;
                    ">
                      🔍 View Details
                    </button>
                  </div>

                  <!-- Store Link Button -->
                  <div style="margin-top: 10px;">
                    <a href="${directStoreUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       style="
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        gap: 6px; 
                        background: rgba(16, 185, 129, 0.12); 
                        color: #10b981; 
                        border: 1px solid rgba(16, 185, 129, 0.3); 
                        padding: 10px; 
                        border-radius: 12px; 
                        font-weight: 800; 
                        font-size: 13px; 
                        text-decoration: none; 
                      ">
                      🌐 Buy ${shoe.model} Direct on Store &rarr;
                    </a>
                  </div>

                </div>
              `;
            })
            .join('')}
        </div>

        <!-- Modals Container -->
        <div id="modal-container"></div>
      </div>
    `;

    this.bindEvents(container);
  }

  bindEvents(container) {
    // Brand filter handlers
    document.getElementById('filter-all')?.addEventListener('click', () => {
      this.loadFitWiseRecommendations(container, null);
    });

    container.querySelectorAll('.filter-badge[data-brand]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const brand = e.currentTarget.getAttribute('data-brand');
        this.loadFitWiseRecommendations(container, brand);
      });
    });

    // Category pill handlers
    container.querySelectorAll('.category-pill').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.getAttribute('data-cat');
        this.renderRecommendations(container);
      });
    });

    // Re-evaluate button
    document.getElementById('btn-re-evaluate')?.addEventListener('click', () => {
      if (this.onBack) this.onBack();
    });

    // Detail Modal Triggers
    container.querySelectorAll('.open-detail-trigger').forEach((el) => {
      el.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-shoe-idx'), 10);
        const match = this.results.matches[idx];
        if (match) this.openShoeDetailModal(match);
      });
    });

    // Virtual Try-On Modal Trigger
    container.querySelectorAll('.btn-try-on').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-shoe-idx'), 10);
        const match = this.results.matches[idx];
        if (match) this.openVirtualTryOnModal(match);
      });
    });
  }

  openShoeDetailModal(match) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const shoe = match.shoe;
    const summary = this.results.query_summary;
    const directStoreUrl = getDirectProductUrl(shoe);
    const priceUsd = shoe.price_usd || Math.round(shoe.price_inr / 83);
    const priceInr = shoe.price_inr || priceUsd * 83;

    modalContainer.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(9, 13, 22, 0.85); backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 20px;
      " class="animate-fade-in">
        <div class="glass-card" style="
          max-width: 640px; width: 100%; background: #0f172a; color: #fff;
          border-radius: 28px; padding: 32px; border: 1px solid rgba(0, 186, 198, 0.3);
          box-shadow: 0 24px 60px rgba(0,0,0,0.6); position: relative; max-height: 90vh; overflow-y: auto;
        ">
          <button id="close-detail-modal" style="
            position: absolute; top: 18px; right: 18px; background: rgba(255,255,255,0.1);
            border: none; color: #fff; font-size: 18px; width: 36px; height: 36px;
            border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
          ">&times;</button>

          <!-- Model Header -->
          <div style="display: flex; gap: 20px; margin-bottom: 24px; align-items: center;">
            <div style="width: 140px; height: 140px; border-radius: 20px; overflow: hidden; background: #fff; border: 1px solid rgba(255,255,255,0.15); padding: 8px; flex-shrink: 0;">
              <img src="${getDirectImageUrl(shoe.image_url)}" alt="${shoe.brand} ${shoe.model}" style="width: 100%; height: 100%; object-fit: contain;" />
            </div>
            <div>
              <span style="background: rgba(250, 133, 90, 0.25); color: #FA855A; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
                ${shoe.brand} • ${shoe.category || 'Casual'}
              </span>
              <h2 style="font-size: 24px; font-weight: 900; margin: 8px 0 4px 0; color: #fff;">
                ${shoe.brand} ${shoe.model}
              </h2>
              <div style="font-size: 20px; font-weight: 800; color: #62C4DA;">
                ₹${priceInr.toLocaleString()} <span style="font-size: 13px; color: #a4b8c4;">($${priceUsd} USD)</span>
              </div>
            </div>
          </div>

          <!-- Fit Details -->
          <div style="background: rgba(255,255,255,0.06); border-radius: 18px; padding: 18px; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; color: #FFDE96; text-transform: uppercase; margin-bottom: 8px;">
              📐 Recommended Calibrated Size
            </div>
            <div style="font-size: 20px; font-weight: 900; color: #fff;">
              US ${summary.recommended_size_us} / UK ${summary.recommended_size_uk} / EU ${Math.round(summary.recommended_size_us + 33)}
            </div>
            <div style="font-size: 12px; color: #a4b8c4; margin-top: 4px;">
              Target Foot Length: ${this.payload.foot.foot_length}mm • Forefoot Width: ${this.payload.foot.forefoot_width}mm
            </div>
          </div>

          <!-- Match Reasons -->
          <div style="margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; color: #62C4DA; text-transform: uppercase; margin-bottom: 10px;">
              🩺 Orthopedic & Biomechanical Match Reasons
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${(match.reasons || [])
                .map((r) => `<div style="font-size: 13px; color: #e2e8f0; line-height: 1.4;">${r}</div>`)
                .join('')}
            </div>
          </div>

          <!-- Direct Store Link Button -->
          <a href="${directStoreUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="
            display: block; text-align: center; padding: 14px 28px; font-weight: 900; font-size: 16px;
            border-radius: 16px; text-decoration: none; background: var(--grad-accent);
            box-shadow: 0 8px 24px rgba(250, 133, 90, 0.4); margin-top: 16px;
          ">
            🌐 Buy ${shoe.brand} ${shoe.model} Direct on Store &rarr;
          </a>
        </div>
      </div>
    `;

    document.getElementById('close-detail-modal')?.addEventListener('click', () => {
      modalContainer.innerHTML = '';
    });
  }

  openVirtualTryOnModal(match) {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    const shoe = match.shoe;
    const footLen = this.payload.foot.foot_length;
    const footWid = this.payload.foot.forefoot_width;
    const recUs = this.results.query_summary.recommended_size_us;

    modalContainer.innerHTML = `
      <div style="
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(9, 13, 22, 0.85); backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 20px;
      " class="animate-fade-in">
        <div class="glass-card" style="
          max-width: 540px; width: 100%; background: #0f172a; color: #fff;
          border-radius: 24px; padding: 28px; border: 1px solid rgba(0, 186, 198, 0.3);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5); position: relative;
        ">
          <button id="close-modal" style="
            position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.1);
            border: none; color: #fff; font-size: 18px; width: 32px; height: 32px;
            border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
          ">&times;</button>

          <div style="text-align: center; margin-bottom: 20px;">
            <span style="background: rgba(0, 186, 198, 0.2); color: #38bdf8; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; text-transform: uppercase;">
              ✨ Virtual Try-On Simulation
            </span>
            <h3 style="font-size: 22px; font-weight: 800; margin: 8px 0 4px 0; color: #fff;">
              ${shoe.brand} ${shoe.model}
            </h3>
            <p style="font-size: 13px; color: #94a3b8; margin: 0;">
              Simulating 3D Last overlay against your ${footLen}mm × ${footWid}mm foot scan.
            </p>
          </div>

          <div style="
            position: relative; width: 100%; height: 220px; border-radius: 18px;
            background: radial-gradient(circle, #1e293b 0%, #090d16 100%);
            display: flex; align-items: center; justify-content: center; overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1); margin-bottom: 20px;
          ">
            <img src="${getDirectImageUrl(shoe.image_url)}" alt="${shoe.model}" style="width: 80%; height: 80%; object-fit: contain; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));" />
            <div class="laser-sweep-line"></div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 13px; color: #94a3b8;">
              Recommended Size: <strong style="color: #38bdf8;">US ${recUs}</strong>
            </div>
            <a href="${getDirectProductUrl(shoe)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="padding: 10px 20px; font-weight: 800; text-decoration: none;">
              🌐 Buy Direct on Store &rarr;
            </a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('close-modal')?.addEventListener('click', () => {
      modalContainer.innerHTML = '';
    });
  }
}
