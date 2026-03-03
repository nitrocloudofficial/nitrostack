import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createComponent, Component } from '../core/component.js';
import { ExecutionContext } from '../core/types.js';

function inlineHtmlWithAssets(htmlPath: string, outDir: string): string {
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Inline <link rel="stylesheet" href="...">
  html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g, (_m, href) => {
    try {
      // Remove leading slash for absolute paths
      const cleanHref = href.startsWith('/') ? href.slice(1) : href;
      const cssPath = path.join(outDir, cleanHref);
      const css = fs.readFileSync(cssPath, 'utf8');
      return `<style>${css}</style>`;
    } catch (err) {
      // CSS file not found - remove the link tag
      return '';
    }
  });

  // Inline <script src="...">
  html = html.replace(/<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/g, (_m, src) => {
    try {
      // Remove leading slash for absolute paths
      const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
      const jsPath = path.join(outDir, cleanSrc);
      const js = fs.readFileSync(jsPath, 'utf8');
      // Return inlined script without type="module" to avoid issues with Next.js code
      return `<script>${js}</script>`;
    } catch (err) {
      // JS file not found - remove the script tag
      return '';
    }
  });

  // Remove preload links for assets we couldn't inline (prevents 404s and warnings)
  html = html.replace(/<link[^>]*rel=["']preload["'][^>]*>/g, '');

  return html;
}

function scaffoldAppRoute(projectDir: string, routePath: string): { created: boolean } {
  const appDir = path.join(projectDir, 'app');
  const created = !fs.existsSync(appDir);
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true });
  const routeDir = path.join(appDir, routePath);
  if (!fs.existsSync(routeDir)) fs.mkdirSync(routeDir, { recursive: true });
  const target = path.join(routeDir, 'page.tsx');
  // Create a re-export shim pointing to widgets/<route>/page.tsx
  const shim = `export { default } from '../../${routePath}/page';\n`;
  fs.writeFileSync(target, shim, 'utf8');
  return { created };
}

function cleanupAppRoute(projectDir: string, routePath: string, removeAppDir: boolean) {
  try {
    const appDir = path.join(projectDir, 'app');
    const routeDir = path.join(appDir, routePath);
    if (fs.existsSync(routeDir)) fs.rmSync(routeDir, { recursive: true, force: true });
    if (removeAppDir && fs.existsSync(appDir)) fs.rmSync(appDir, { recursive: true, force: true });
  } catch {}
}

export interface CreateNextComponentOptions {
  id: string;
  name: string;
  projectDir: string; // path to Next widget project (with next.config.js)
  entryHtml?: string; // default: out/index.html
  description?: string;
  prefersBorder?: boolean;
  csp?: { connectDomains?: string[]; resourceDomains?: string[] };
  transformer?: (data: unknown, context: ExecutionContext) => unknown;
  build?: boolean; // default true
  buildScript?: string; // default 'npm run build'
}

/**
 * Build a Next.js widget and create a NitroStack Component from the exported HTML.
 * Produces a single-file HTML bundle compatible with OpenAI Apps SDK widgets.
 */
export function createComponentFromNext(opts: CreateNextComponentOptions): Component {
  const {
    id,
    name,
    projectDir,
    entryHtml = 'out/index.html',
    description,
    prefersBorder,
    csp,
    transformer,
    build = true,
    buildScript,
  } = opts;

  if (!fs.existsSync(projectDir)) {
    throw new Error(`Next widget project not found: ${projectDir}`);
  }

  if (build) {
    const cmd = buildScript || 'npm run build';
    execSync(cmd, { stdio: 'inherit', cwd: projectDir });
  }

  const outPath = path.resolve(projectDir, entryHtml);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outPath)) {
    throw new Error(`Exported HTML not found at ${outPath}. Ensure next.config.js has output: 'export'.`);
  }

  const inlined = inlineHtmlWithAssets(outPath, outDir);

  return createComponent({
    id,
    name,
    description,
    html: inlined,
    prefersBorder,
    csp,
    transformer,
  });
}

export const uiNext = { createComponentFromNext };

// ------- Multi-route support (single Next project with multiple routes) -------

const buildCache: Map<string, number> = new Map();

export interface CreateNextRouteOptions extends Omit<CreateNextComponentOptions, 'entryHtml'> {
  routePath: string; // e.g. 'product-card' (maps to out/product-card/index.html)
}

// Developer-friendly overload: allow passing only routePath and infer the rest
export function createComponentFromNextRoute(routePath: string, options?: Partial<CreateNextRouteOptions>): Component;
export function createComponentFromNextRoute(opts: CreateNextRouteOptions): Component;
export function createComponentFromNextRoute(
  arg1: string | CreateNextRouteOptions,
  arg2?: Partial<CreateNextRouteOptions>
): Component {
  const isString = typeof arg1 === 'string';
  const routePath = isString ? (arg1 as string) : (arg1 as CreateNextRouteOptions).routePath;
  const provided = (isString ? (arg2 || {}) : (arg1 as CreateNextRouteOptions));

  // Check if we're in widget dev mode
  const widgetsDevMode = process.env.WIDGETS_DEV_MODE === 'true';
  const widgetsDevPort = process.env.WIDGETS_DEV_PORT || '3001';
  
  // In dev mode, return a component with a dev URL instead of static HTML
  if (widgetsDevMode) {
    const id = provided.id || `next-${routePath}`;
    const name = provided.name || routePath
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
    
    // Return a special dev component that uses live URL
    return createComponent({
      id,
      name,
      description: provided.description,
      // Empty HTML - will be loaded from dev server
      html: `<!-- Widget loaded from dev server: /widgets/${routePath} -->`,
      css: '',
      js: '',
      prefersBorder: provided.prefersBorder,
      csp: provided.csp,
      transformer: provided.transformer,
      // Store dev URL as metadata for inspector to use
      _meta: {
        devUrl: `/widgets/${routePath}`,
        devMode: true,
      },
    });
  }

  // Defaults - look in src/widgets (for dev) or dist/widgets (for built)
  const srcWidgetsRoot = path.resolve(process.cwd(), 'src', 'widgets');
  const distWidgetsRoot = path.resolve(process.cwd(), 'dist', 'widgets');
  const defaultDir = fs.existsSync(srcWidgetsRoot) ? srcWidgetsRoot : distWidgetsRoot;
  const id = provided.id || `next-${routePath}`;
  const name = provided.name || routePath
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
  const projectDir = provided.projectDir || defaultDir;
  const description = provided.description;
  const prefersBorder = provided.prefersBorder;
  const csp = provided.csp;
  const transformer = provided.transformer;
  // Default build to FALSE - widgets should be pre-built by npm run build
  const build = provided.build !== undefined ? provided.build : false;
  const buildScript = provided.buildScript;

  if (build) {
    const { created } = scaffoldAppRoute(projectDir, routePath);
    const last = buildCache.get(projectDir) || 0;
    const now = Date.now();
    // simple debounce to avoid rebuilding multiple times in a row
    if (now - last > 2000) {
      const cmd = buildScript || 'npm run build';
      execSync(cmd, { stdio: 'inherit', cwd: projectDir });
      buildCache.set(projectDir, now);
    }
    cleanupAppRoute(projectDir, routePath, created);
  }

  // Try both possible Next.js export locations
  let outPath = path.resolve(projectDir, 'out', routePath, 'index.html');
  if (!fs.existsSync(outPath)) {
    // Try flat structure (route-name.html)
    outPath = path.resolve(projectDir, 'out', `${routePath}.html`);
    if (!fs.existsSync(outPath)) {
      throw new Error(
        `Exported HTML for route '${routePath}' not found. Tried:\n` +
        `  - ${path.resolve(projectDir, 'out', routePath, 'index.html')}\n` +
        `  - ${path.resolve(projectDir, 'out', `${routePath}.html`)}`
      );
    }
  }
  // For Next.js widgets, we need to create a simple renderer that works with data
  // Instead of using complex Next.js hydration, generate simple HTML dynamically
  const widgetHtml = generateSimpleWidgetHtml(routePath, id);

  return createComponent({
    id,
    name,
    description,
    html: widgetHtml,
    prefersBorder,
    csp,
    transformer,
  });
}

/**
 * Generate simple, dynamic widget HTML that reads window.openai.toolOutput
 */
function generateSimpleWidgetHtml(routePath: string, widgetId: string): string {
  // Base template that all widgets use
  const baseTemplate = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { box-sizing: border-box; }
body { 
  margin: 16px; 
  padding: 0; 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
  background: #ffffff;
  color: #1a1a1a;
  min-height: 100px;
}
.widget-container { 
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
  max-width: 100%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.widget-header {
  padding: 20px;
  background: linear-gradient(135deg, #D4AF37 0%, #F5C842 100%);
  color: #000;
  font-weight: 700;
  font-size: 18px;
}
.widget-body {
  padding: 20px;
}
.success { 
  color: #D4AF37; 
  font-weight: 700; 
  margin-bottom: 16px; 
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.error { 
  color: #ef4444; 
  font-weight: 700; 
  margin-bottom: 16px; 
  font-size: 18px;
}
.profile-img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid #D4AF37;
  margin-bottom: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
.product-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 12px;
}
.card { 
  border: 1px solid #e5e7eb; 
  padding: 16px; 
  border-radius: 12px; 
  background: #f9fafb;
  margin-bottom: 12px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.card:hover {
  border-color: #D4AF37;
  box-shadow: 0 4px 6px rgba(212, 175, 55, 0.2);
  transform: translateY(-2px);
}
.field { margin: 10px 0; font-size: 14px; color: #374151; }
.label { color: #6b7280; font-size: 13px; margin-right: 8px; font-weight: 500; }
.token { 
  margin-top: 12px; 
  padding: 12px; 
  background: #f3f4f6; 
  border-radius: 8px; 
  font-size: 12px; 
  word-break: break-all; 
  font-family: monospace;
  border: 1px solid #D4AF37;
  color: #D4AF37;
}
.grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); 
  gap: 16px; 
}
.product-card { 
  border: 1px solid #e5e7eb; 
  border-radius: 12px; 
  background: #ffffff;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.product-card:hover {
  border-color: #D4AF37;
  box-shadow: 0 8px 16px rgba(212, 175, 55, 0.3);
  transform: translateY(-4px);
}
.product-card-img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  background: #f9fafb;
}
.product-card-body {
  padding: 16px;
}
.product-name {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 8px;
  line-height: 1.3;
  color: #1a1a1a;
}
.product-desc {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
  line-height: 1.5;
}
.empty { 
  color: #9ca3af; 
  text-align: center; 
  padding: 60px 20px; 
  font-size: 15px;
}
.price {
  color: #D4AF37;
  font-weight: 700;
  font-size: 20px;
}
.stock-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: rgba(212, 175, 55, 0.1);
  color: #D4AF37;
  border: 1px solid rgba(212, 175, 55, 0.3);
  margin-top: 8px;
}
</style>
</head>
<body>
<div id="root">Loading...</div>
<script>
(function() {
  function render() {
    const data = (window.openai && window.openai.toolOutput) || {};
    const root = document.getElementById('root');
    
    ${getWidgetRenderFunction(routePath)}
    
    root.innerHTML = html;
  }
  
  // Render immediately if data available
  if (window.openai && window.openai.toolOutput) {
    render();
  } else {
    // Wait for data to be injected
    setTimeout(render, 50);
  }
})();
</script>
</body>
</html>`;

  return baseTemplate;
}

/**
 * Get widget-specific render function
 */
function getWidgetRenderFunction(routePath: string): string {
  switch (routePath) {
    case 'login-result':
      return `
    const user = data.user;
    const html = '<div class="widget-container">' + (user 
      ? '<div class="widget-header">✅ Login Successful</div>' +
        '<div class="widget-body">' +
        (user.profile_picture ? '<div style="text-align:center;margin-bottom:16px;"><img src="' + user.profile_picture + '" class="profile-img" alt="' + user.name + '"></div>' : '') +
        '<div class="card">' +
        '<div class="field"><span class="label">Name:</span> ' + user.name + '</div>' +
        '<div class="field"><span class="label">Email:</span> ' + user.email + '</div>' +
        '</div>' +
        (data.token ? '<div class="token"><div style="color:#6b7280;margin-bottom:6px;font-size:11px;">Authentication Token:</div>' + data.token.substring(0, 60) + '...</div>' : '') +
        '</div>'
      : '<div class="widget-body"><div class="error">⚠️ Unable to log in</div></div>') + '</div>';
      `;
    
    case 'whoami':
      return `
    const user = data.user;
    const html = '<div class="widget-container">' + (user
      ? '<div class="widget-header">👤 User Profile</div>' +
        '<div class="widget-body" style="text-align:center;">' +
        (user.profile_picture ? '<img src="' + user.profile_picture + '" class="profile-img" alt="Profile">' : '') +
        '<div class="card" style="text-align:left;">' +
        '<div class="field"><span class="label">Name:</span> ' + user.name + '</div>' +
        '<div class="field"><span class="label">Email:</span> ' + user.email + '</div>' +
        (user.memberSince ? '<div class="field"><span class="label">Member Since:</span> ' + new Date(user.memberSince).toLocaleDateString() + '</div>' : '') +
        '</div></div>'
      : '<div class="widget-body"><div class="error">⚠️ Not authenticated</div></div>') + '</div>';
      `;
    
    case 'products-grid':
      return `
    const products = data.products || [];
    const html = '<div class="widget-container">' + (products.length > 0
      ? '<div class="widget-header">🛍️ ' + products.length + ' Products Available</div>' +
        '<div class="widget-body"><div class="grid">' + products.map(p => 
          '<div class="product-card">' +
          (p.image_url ? '<img src="' + p.image_url + '" class="product-card-img" alt="' + p.name + '">' : '') +
          '<div class="product-card-body">' +
          '<div class="product-name">' + p.name + '</div>' +
          '<div class="product-desc">' + p.description.substring(0, 70) + '...</div>' +
          '<div class="price">$' + p.price.toFixed(2) + '</div>' +
          '<div class="stock-badge">' + p.stock + ' in stock</div>' +
          '</div>' +
          '</div>'
        ).join('') + '</div></div>'
      : '<div class="widget-body"><div class="empty">No products found</div></div>') + '</div>';
      `;
    
    case 'shopping-cart':
      return `
    const items = data.items || [];
    const total = data.total || 0;
    const html = '<div class="widget-container">' + (items.length > 0
      ? '<div class="widget-header">🛒 Shopping Cart (' + items.length + ' items)</div>' +
        '<div class="widget-body">' +
        items.map(item => 
          '<div class="card">' +
          '<div style="display:flex;gap:12px;align-items:flex-start;">' +
          (item.image_url ? '<img src="' + item.image_url + '" style="width:60px;height:60px;border-radius:8px;object-fit:cover;" alt="' + item.name + '">' : '') +
          '<div style="flex:1;">' +
          '<div style="font-weight:600;color:#1a1a1a;margin-bottom:4px;">' + item.name + '</div>' +
          '<div class="label">Qty: ' + item.quantity + ' × $' + item.price.toFixed(2) + '</div>' +
          '</div>' +
          '<div class="price">$' + (item.price * item.quantity).toFixed(2) + '</div>' +
          '</div>' +
          '</div>'
        ).join('') +
        '<div class="card" style="border-color:#D4AF37;background:#fffbf0;"><strong style="color:#D4AF37;font-size:18px;">Total: $' + total.toFixed(2) + '</strong></div>' +
        '</div>'
      : '<div class="widget-body"><div class="empty">🛒 Cart is empty</div></div>') + '</div>';
      `;
    
    case 'order-confirmation':
      return `
    const order = data.order;
    const html = '<div class="widget-container">' + (order
      ? '<div class="widget-header">✅ Order Confirmed</div>' +
        '<div class="widget-body">' +
        '<div class="card">' +
        '<div class="field"><span class="label">Order ID:</span> #' + order.id.substring(0, 8).toUpperCase() + '</div>' +
        '<div class="field"><span class="label">Status:</span> <span class="stock-badge">' + order.status + '</span></div>' +
        '<div class="field"><span class="label">Items:</span> ' + (order.items ? order.items.length : 0) + ' products</div>' +
        '</div>' +
        (order.items && order.items.length > 0 ? order.items.map(item => 
          '<div class="card">' +
          '<div style="display:flex;gap:10px;">' +
          (item.image_url ? '<img src="' + item.image_url + '" style="width:50px;height:50px;border-radius:6px;object-fit:cover;" alt="' + item.name + '">' : '') +
          '<div><div style="font-weight:600;color:#1a1a1a;">' + item.name + '</div>' +
          '<div class="label">Qty: ' + item.quantity + ' × $' + item.price.toFixed(2) + '</div></div>' +
          '</div>' +
          '</div>'
        ).join('') : '') +
        '<div class="card" style="border-color:#D4AF37;background:#fffbf0;text-align:center;"><strong class="price" style="font-size:22px;">Total: $' + order.total.toFixed(2) + '</strong></div>' +
        '</div>'
      : '<div class="widget-body"><div class="error">⚠️ No order data</div></div>') + '</div>';
      `;
    
    case 'product-card':
      return `
    const product = data.product;
    const html = '<div class="widget-container">' + (product
      ? '<div class="widget-header">📦 Product Details</div>' +
        '<div class="widget-body">' +
        (product.image_url ? '<img src="' + product.image_url + '" class="product-img" alt="' + product.name + '">' : '') +
        '<div class="product-name" style="font-size:22px;margin-bottom:12px;">' + product.name + '</div>' +
        '<div class="product-desc" style="color:#6b7280;font-size:14px;margin-bottom:16px;">' + product.description + '</div>' +
        '<div class="card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
        '<div class="price">$' + product.price.toFixed(2) + '</div>' +
        '<div class="stock-badge">' + product.stock + ' in stock</div>' +
        '</div>' +
        '<div class="field"><span class="label">Category:</span> ' + product.category + '</div>' +
        '</div>' +
        '</div>'
      : '<div class="widget-body"><div class="error">⚠️ Product not found</div></div>') + '</div>';
      `;
    
    case 'add-to-cart':
      return `
    const item = data.item;
    const html = '<div class="widget-container">' + (item
      ? '<div class="widget-header">✅ Added to Cart</div>' +
        '<div class="widget-body">' +
        '<div class="card">' +
        '<div style="display:flex;gap:12px;align-items:center;">' +
        (item.image_url ? '<img src="' + item.image_url + '" style="width:80px;height:80px;border-radius:8px;object-fit:cover;" alt="' + item.name + '">' : '') +
        '<div style="flex:1;">' +
        '<div style="font-weight:700;font-size:16px;color:#1a1a1a;margin-bottom:4px;">' + item.name + '</div>' +
        '<div class="label">Quantity: ' + item.quantity + '</div>' +
        '<div class="price" style="font-size:18px;margin-top:4px;">$' + item.price.toFixed(2) + '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<div style="text-align:center;margin-top:16px;padding:12px;background:#f0fdf4;border-radius:8px;color:#16a34a;font-weight:600;">' +
        '🛒 Cart Total: ' + data.cartItemCount + ' items' +
        '</div>' +
        '</div>'
      : '<div class="widget-body"><div class="error">⚠️ Failed to add to cart</div></div>') + '</div>';
      `;
    
    case 'address-list':
      return `
    const addresses = data.addresses || [];
    const html = '<div class="widget-container">' + (addresses.length > 0
      ? '<div class="widget-header">📍 Delivery Addresses</div>' +
        '<div class="widget-body">' +
        addresses.map(addr => 
          '<div class="card">' +
          '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">' +
          '<div style="font-weight:700;color:#1a1a1a;">' + addr.full_name + '</div>' +
          (addr.is_default ? '<div class="stock-badge">Default</div>' : '') +
          '</div>' +
          '<div class="field">' + addr.street + '</div>' +
          '<div class="field">' + addr.city + ', ' + addr.state + ' ' + addr.zip_code + '</div>' +
          '<div class="field"><span class="label">Phone:</span> ' + addr.phone + '</div>' +
          '</div>'
        ).join('') +
        '</div>'
      : '<div class="widget-body"><div class="empty">No saved addresses</div></div>') + '</div>';
      `;
    
    case 'order-history':
      return `
    const orders = data.orders || [];
    const html = '<div class="widget-container">' + (orders.length > 0
      ? '<div class="widget-header">📦 Order History</div>' +
        '<div class="widget-body">' +
        orders.map(order => 
          '<div class="card">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:12px;">' +
          '<div><span class="label">Order #</span>' + order.id.substring(0, 8).toUpperCase() + '</div>' +
          '<div class="stock-badge">' + order.status + '</div>' +
          '</div>' +
          '<div class="field"><span class="label">Items:</span> ' + order.itemCount + ' products</div>' +
          '<div class="field"><span class="label">Date:</span> ' + new Date(order.created_at).toLocaleDateString() + '</div>' +
          '<div class="price" style="margin-top:8px;">Total: $' + order.total.toFixed(2) + '</div>' +
          '</div>'
        ).join('') +
        '</div>'
      : '<div class="widget-body"><div class="empty">No orders yet</div></div>') + '</div>';
      `;
    
    case 'order-details':
      return `
    const order = data.order;
    const html = '<div class="widget-container">' + (order
      ? '<div class="widget-header">📦 Order #' + order.id.substring(0, 8).toUpperCase() + '</div>' +
        '<div class="widget-body">' +
        '<div class="card">' +
        '<div class="field"><span class="label">Status:</span> <span class="stock-badge">' + order.status + '</span></div>' +
        '<div class="field"><span class="label">Date:</span> ' + new Date(order.created_at).toLocaleDateString() + '</div>' +
        '<div class="field"><span class="label">Payment:</span> ' + order.payment_method.replace('_', ' ') + '</div>' +
        '</div>' +
        '<div style="margin-top:16px;margin-bottom:8px;font-weight:700;color:#1a1a1a;">Order Items</div>' +
        (order.items && order.items.length > 0 ? order.items.map(item => 
          '<div class="card">' +
          '<div style="display:flex;gap:10px;">' +
          (item.image_url ? '<img src="' + item.image_url + '" style="width:50px;height:50px;border-radius:6px;object-fit:cover;" alt="' + item.name + '">' : '') +
          '<div style="flex:1;"><div style="font-weight:600;color:#1a1a1a;">' + item.name + '</div>' +
          '<div class="label">Qty: ' + item.quantity + ' × $' + item.price.toFixed(2) + '</div></div>' +
          '</div>' +
          '</div>'
        ).join('') : '') +
        '<div class="card" style="border-color:#D4AF37;background:#fffbf0;text-align:center;"><strong class="price" style="font-size:20px;">Total: $' + order.total.toFixed(2) + '</strong></div>' +
        '</div>'
      : '<div class="widget-body"><div class="error">⚠️ Order not found</div></div>') + '</div>';
      `;
    
    case 'categories':
      return `
    const categories = data.categories || [];
    const html = '<div class="widget-container">' + (categories.length > 0
      ? '<div class="widget-header">🏷️ Product Categories</div>' +
        '<div class="widget-body"><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">' +
        categories.map(cat => 
          '<div class="card" style="cursor:pointer;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div><div style="font-weight:600;color:#1a1a1a;">' + cat.name + '</div>' +
          '<div class="label" style="margin-top:2px;">' + cat.productCount + ' products</div></div>' +
          '<div style="font-size:24px;">📦</div>' +
          '</div>' +
          '</div>'
        ).join('') + '</div></div>'
      : '<div class="widget-body"><div class="empty">No categories available</div></div>') + '</div>';
      `;
    
    case 'cart-updated':
      return `
    const message = data.message;
    const product = data.product;
    const quantity = data.quantity;
    const html = '<div class="widget-container">' +
      '<div class="widget-header">✅ Cart Updated</div>' +
      '<div class="widget-body" style="text-align:center;padding:32px 20px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">🛒</div>' +
      '<div style="font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:12px;">' + message + '</div>' +
      (product ? '<div class="card" style="margin-top:16px;text-align:left;">' +
        '<div class="label" style="margin-bottom:4px;">Product Updated</div>' +
        '<div style="font-weight:600;color:#1a1a1a;">' + product + '</div>' +
        (quantity !== undefined ? '<div class="label" style="margin-top:4px;">New quantity: ' + quantity + '</div>' : '') +
        '</div>' : '') +
      '</div></div>';
      `;
    
    case 'cart-cleared':
      return `
    const message = data.message;
    const itemsRemoved = data.itemsRemoved || 0;
    const html = '<div class="widget-container">' +
      '<div class="widget-header">🗑️ Cart Cleared</div>' +
      '<div class="widget-body" style="text-align:center;padding:40px 20px;">' +
      '<div style="font-size:56px;margin-bottom:16px;">🛒</div>' +
      '<div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:12px;">' + message + '</div>' +
      '<div class="card" style="margin-top:24px;background:#f9fafb;">' +
      '<div style="color:#6b7280;"><span style="font-weight:600;color:#1a1a1a;">' + itemsRemoved + '</span> item' + (itemsRemoved !== 1 ? 's were' : ' was') + ' removed from your cart</div>' +
      '</div>' +
      '<div style="margin-top:24px;font-size:14px;color:#9ca3af;">Your shopping cart is now empty</div>' +
      '</div></div>';
      `;
    
    case 'address-added':
      return `
    const message = data.message;
    const addressId = data.addressId || '';
    const isDefault = data.isDefault;
    const html = '<div class="widget-container">' +
      '<div class="widget-header">✅ Address Added</div>' +
      '<div class="widget-body" style="text-align:center;padding:32px 20px;">' +
      '<div style="font-size:48px;margin-bottom:16px;">📍</div>' +
      '<div style="font-size:18px;font-weight:600;color:#1a1a1a;margin-bottom:12px;">' + message + '</div>' +
      '<div class="card" style="margin-top:16px;">' +
      '<div class="label" style="margin-bottom:8px;">Address ID</div>' +
      '<div style="font-family:monospace;font-size:11px;color:#6b7280;background:#f3f4f6;padding:8px 12px;border-radius:6px;">' + addressId.substring(0, 16) + '...</div>' +
      (isDefault ? '<div style="margin-top:12px;"><span class="stock-badge">⭐ Default Address</span></div>' : '') +
      '</div>' +
      '<div style="margin-top:16px;font-size:14px;color:#9ca3af;">You can now use this address for deliveries</div>' +
      '</div></div>';
      `;
    
    case 'address-updated':
      return `
    const message = data.message;
    const address = data.address;
    const html = '<div class="widget-container">' +
      '<div class="widget-header">✅ Default Address Updated</div>' +
      '<div class="widget-body">' +
      '<div style="text-align:center;margin-bottom:16px;"><div style="font-size:40px;margin-bottom:12px;">📍</div>' +
      '<div style="font-size:18px;font-weight:600;color:#1a1a1a;">' + message + '</div></div>' +
      (address ? '<div class="card" style="background:rgba(212,175,55,0.05);border-color:#D4AF37;">' +
        '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">' +
        '<div style="font-weight:600;color:#1a1a1a;">' + address.full_name + '</div>' +
        '<span class="stock-badge">DEFAULT</span>' +
        '</div>' +
        '<div style="font-size:14px;color:#374151;line-height:1.6;">' +
        '<div>' + address.street + '</div>' +
        '<div>' + address.city + ', ' + address.state + ' ' + address.zip_code + '</div>' +
        '<div>' + address.country + '</div>' +
        '<div style="color:#6b7280;margin-top:8px;">📞 ' + address.phone + '</div>' +
        '</div>' +
        '</div>' : '') +
      '<div style="margin-top:16px;text-align:center;font-size:14px;color:#9ca3af;">This address will be used by default for your orders</div>' +
      '</div></div>';
      `;
    
    case 'address-deleted':
      return `
    const message = data.message;
    const html = '<div class="widget-container">' +
      '<div class="widget-header">🗑️ Address Deleted</div>' +
      '<div class="widget-body" style="text-align:center;padding:40px 20px;">' +
      '<div style="font-size:56px;margin-bottom:16px;">📍</div>' +
      '<div style="font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:12px;">' + message + '</div>' +
      '<div class="card" style="margin-top:24px;background:#fef2f2;border-color:#fecaca;">' +
      '<div style="color:#dc2626;">The address has been permanently removed from your account</div>' +
      '</div>' +
      '<div style="margin-top:24px;font-size:14px;color:#9ca3af;">You can add a new address anytime</div>' +
      '</div></div>';
      `;
    
    default:
      return `
    const html = '<div class="widget-container"><div class="widget-body"><pre style="background:#f3f4f6;padding:12px;border-radius:8px;overflow:auto;font-size:12px;">' + JSON.stringify(data, null, 2) + '</pre></div></div>';
      `;
  }
}


