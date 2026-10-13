/**
 * Ghibli Style Sporty Shoe SVGs
 * Renders hand-drawn watercolor aesthetic vector graphics for matching shoe recommendations.
 */

const runnerSVG = `
<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
  <defs>
    <!-- Soft watercolor Ghibli gradients -->
    <linearGradient id="runnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7b54" />
      <stop offset="60%" stop-color="#ffb26b" />
      <stop offset="100%" stop-color="#ffd56b" />
    </linearGradient>
    <linearGradient id="soleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f0ece3" />
    </linearGradient>
    <filter id="cozyShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#5c3d2e" flood-opacity="0.15" />
    </filter>
  </defs>
  
  <!-- Shadow -->
  <ellipse cx="100" cy="108" rx="80" ry="8" fill="#5c3d2e" opacity="0.12" />

  <!-- Shoe Body Group -->
  <g filter="url(#cozyShadow)">
    <!-- Sole (chunkier, sporty look) -->
    <path d="M 20 90 Q 25 102 70 102 Q 130 102 175 95 Q 185 92 188 84 Q 180 80 170 80 Q 130 82 70 82 Q 30 80 20 90 Z" fill="url(#soleGrad)" stroke="#8d6e63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M 25 96 C 50 97, 100 97, 170 91" fill="none" stroke="#d7ccc8" stroke-width="1.5" />

    <!-- Upper Body (warm Ghibli gradient) -->
    <path d="M 30 80 Q 25 65 35 55 Q 55 45 80 40 Q 100 35 115 50 Q 135 60 155 70 Q 175 75 182 84 Q 170 80 130 82 Q 70 82 30 80 Z" fill="url(#runnerGrad)" stroke="#8d6e63" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Cozy ankle collar -->
    <path d="M 80 40 Q 95 38 105 45 Q 110 50 115 50 Q 105 50 95 45 Q 85 45 80 40 Z" fill="#ffe0b2" stroke="#8d6e63" stroke-width="1.2" />

    <!-- Sporty overlays (hand-drawn Ghibli stripes) -->
    <path d="M 60 81 Q 80 50 100 44" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" opacity="0.85" />
    <path d="M 70 81 Q 90 55 106 48" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity="0.85" />
    
    <!-- Toe guard overlay -->
    <path d="M 160 72 Q 178 76 182 84 Q 170 83 162 78 Z" fill="#ff7b54" stroke="#8d6e63" stroke-width="1.2" opacity="0.9" />

    <!-- Laces and Eyelets -->
    <circle cx="98" cy="48" r="2.5" fill="#d7ccc8" stroke="#8d6e63" stroke-width="1" />
    <circle cx="106" cy="53" r="2.5" fill="#d7ccc8" stroke="#8d6e63" stroke-width="1" />
    <circle cx="114" cy="58" r="2.5" fill="#d7ccc8" stroke="#8d6e63" stroke-width="1" />
    
    <!-- Ribbon tie (cozy watercolor laces bowing) -->
    <path d="M 98 48 Q 90 35 84 42 Q 92 46 98 48 Z" fill="#fff" stroke="#8d6e63" stroke-width="1.2" />
    <path d="M 98 48 Q 108 30 112 36 Q 104 42 98 48 Z" fill="#fff" stroke="#8d6e63" stroke-width="1.2" />
    <path d="M 98 48 Q 94 65 90 75" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke="#8d6e63" />
  </g>
</svg>
`;

const sneakerSVG = `
<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
  <defs>
    <linearGradient id="sneakerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fdfbf7" />
      <stop offset="100%" stop-color="#eedcc6" />
    </linearGradient>
    <linearGradient id="stripeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3f51b5" />
      <stop offset="100%" stop-color="#1a237e" />
    </linearGradient>
    <filter id="cozyShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#3e2723" flood-opacity="0.15" />
    </filter>
  </defs>
  
  <!-- Shadow -->
  <ellipse cx="100" cy="108" rx="80" ry="7" fill="#3e2723" opacity="0.12" />

  <!-- Shoe Body Group -->
  <g filter="url(#cozyShadow)">
    <!-- Classic thick flat sole -->
    <path d="M 22 88 Q 22 101 70 101 Q 130 101 178 96 Q 183 95 183 87 L 181 83 L 24 83 Z" fill="#fff" stroke="#5d4037" stroke-width="1.5" />
    <path d="M 24 92 H 181" stroke="#e0e0e0" stroke-width="1" />
    <rect x="155" y="85" width="20" height="10" fill="#e0e0e0" opacity="0.4" rx="2" />

    <!-- Upper Body (retro sneaker canvas) -->
    <path d="M 26 83 Q 20 62 32 50 Q 52 40 85 40 Q 115 36 128 54 Q 142 66 162 74 Q 179 78 181 83 Z" fill="url(#sneakerGrad)" stroke="#5d4037" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Ankle inner liner -->
    <path d="M 85 40 Q 98 36 112 43 Q 118 48 118 54 L 110 52 Q 98 48 85 40 Z" fill="#d7ccc8" stroke="#5d4037" stroke-width="1" />

    <!-- Triple Retro Stripes (sporty Ghibli look) -->
    <path d="M 85 83 L 105 47" fill="none" stroke="url(#stripeGrad)" stroke-width="6" stroke-linecap="round" stroke="#5d4037" />
    <path d="M 97 83 L 117 49" fill="none" stroke="url(#stripeGrad)" stroke-width="6" stroke-linecap="round" stroke="#5d4037" />
    <path d="M 109 83 L 129 52" fill="none" stroke="url(#stripeGrad)" stroke-width="6" stroke-linecap="round" stroke="#5d4037" />
    
    <!-- Toe shell cap (retro styling) -->
    <path d="M 162 74 Q 174 76 181 83 L 168 83 Q 160 78 162 74 Z" fill="#ffecb3" stroke="#5d4037" stroke-width="1.2" />

    <!-- Classic Laces -->
    <line x1="120" y1="52" x2="135" y2="44" stroke="#5d4037" stroke-width="2" stroke-linecap="round" />
    <line x1="128" y1="58" x2="143" y2="49" stroke="#5d4037" stroke-width="2" stroke-linecap="round" />
    <line x1="136" y1="64" x2="151" y2="55" stroke="#5d4037" stroke-width="2" stroke-linecap="round" />
    
    <!-- Loose tied laces dangling -->
    <path d="M 116 52 Q 105 40 98 45 Q 108 52 116 52" fill="#fff" stroke="#5d4037" stroke-width="1.2" />
    <path d="M 116 52 Q 125 35 132 40 Q 124 48 116 52" fill="#fff" stroke="#5d4037" stroke-width="1.2" />
  </g>
</svg>
`;

const trailSVG = `
<svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
  <defs>
    <linearGradient id="trailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4e6e5d" />
      <stop offset="70%" stop-color="#344e41" />
      <stop offset="100%" stop-color="#2a3f34" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e76f51" />
      <stop offset="100%" stop-color="#f4a261" />
    </linearGradient>
    <filter id="cozyShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="2" dy="5" stdDeviation="4" flood-color="#1b2e22" flood-opacity="0.2" />
    </filter>
  </defs>
  
  <!-- Shadow -->
  <ellipse cx="100" cy="108" rx="82" ry="8.5" fill="#1b2e22" opacity="0.15" />

  <!-- Shoe Body Group -->
  <g filter="url(#cozyShadow)">
    <!-- Trail rugged sole with lugs (sporty grip) -->
    <path d="M 18 90 Q 23 103 70 103 Q 130 103 176 96 Q 184 93 186 85 L 180 81 L 20 81 Z" fill="#2b2d42" stroke="#1d1e2c" stroke-width="1.5" />
    <!-- Rugged Lugs (triangular Sole Teeth) -->
    <path d="M 25 101 L 28 105 L 34 101 M 45 102 L 48 106 L 54 102 M 65 102 L 68 106 L 74 102 M 90 102 L 93 106 L 99 102 M 115 102 L 118 106 L 124 102 M 140 101 L 143 105 L 149 101" stroke="#1d1e2c" stroke-width="1.5" fill="#2b2d42" />

    <!-- Upper Body (moss green hiking mesh) -->
    <path d="M 25 81 Q 20 64 32 54 Q 52 42 78 40 Q 102 36 120 50 Q 138 60 158 70 Q 176 74 182 82 Q 170 81 125 81 Z" fill="url(#trailGrad)" stroke="#1d1e2c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    
    <!-- Orange accent side strap (Ghibli sporty overlay) -->
    <path d="M 45 81 Q 65 60 90 52 Q 95 65 75 81 Z" fill="url(#accentGrad)" stroke="#1d1e2c" stroke-width="1.2" opacity="0.9" />
    
    <!-- Ankle collar protective pad -->
    <path d="M 78 40 Q 94 38 108 46 Q 116 52 118 52 M 78 40 Q 94 44 108 48" fill="#e76f51" stroke="#1d1e2c" stroke-width="1" />

    <!-- Rugged heel/toe guard -->
    <path d="M 25 81 Q 20 70 28 62 L 35 68 Q 30 76 34 81 Z" fill="#2b2d42" stroke="#1d1e2c" stroke-width="1" />
    <path d="M 158 70 Q 174 72 182 82 Q 170 81 160 76 Z" fill="#2b2d42" stroke="#1d1e2c" stroke-width="1" />

    <!-- Outdoor loop laces (thick cords) -->
    <path d="M 102 48 Q 112 60 120 70" fill="none" stroke="#f4a261" stroke-width="2.5" stroke-linecap="round" stroke="#1d1e2c" />
    <path d="M 110 54 Q 120 64 128 73" fill="none" stroke="#f4a261" stroke-width="2.5" stroke-linecap="round" stroke="#1d1e2c" />
    
    <!-- Lacing loop points -->
    <circle cx="102" cy="48" r="2" fill="#fff" stroke="#1d1e2c" stroke-width="1" />
    <circle cx="110" cy="54" r="2" fill="#fff" stroke="#1d1e2c" stroke-width="1" />
    <circle cx="118" cy="60" r="2" fill="#fff" stroke="#1d1e2c" stroke-width="1" />
  </g>
</svg>
`;

/**
 * Returns inline Ghibli SVG based on the shoe brand and model.
 */
export function getShoeGraphic(brand = '', model = '') {
  const query = `${brand} ${model}`.toLowerCase();
  
  if (query.includes('nike') || query.includes('running') || query.includes('vapor') || query.includes('pegasus') || query.includes('brooks') || query.includes('puma') || query.includes('carbon')) {
    return runnerSVG;
  }
  
  if (query.includes('adidas') || query.includes('stan') || query.includes('samba') || query.includes('classic') || query.includes('converse') || query.includes('star') || query.includes('court')) {
    return sneakerSVG;
  }
  
  // Fallback to outdoor trail look
  return trailSVG;
}
