# VidyaAI MCP - Nitro Cloud Deployment Fix

## Issue Summary
**Error:** `Node.js detected but native WebSocket not found`  
**Root Cause:** Supabase Realtime client was initializing at module load time (top-level), before Node.js 22+ WebSocket support was available on Nitro Cloud.

---

## Changes Applied

### 1. **Added WebSocket Polyfill (`ws` package)**
- **File:** `package.json`
- **Change:** Added `"ws": "^8.16.0"` to dependencies
- **Reason:** Provides WebSocket implementation for Node.js environments
- **Command:** `npm install ws`

### 2. **Added TypeScript Types for WebSocket**
- **File:** `package.json`
- **Change:** Added `"@types/ws": "^8.5.x"` to devDependencies
- **Reason:** Provides TypeScript type definitions for the `ws` module
- **Command:** `npm install --save-dev @types/ws`

### 3. **Created Lazy-Loading Supabase Service**
- **File:** `src/services/supabase.service.ts` (NEW)
- **Key Features:**
  - Lazy initialization (only creates client when first requested)
  - Graceful fallback if credentials are missing
  - Provides WebSocket polyfill for Node.js
  - Singleton pattern to avoid multiple client instances
- **Usage:**
  ```typescript
  import { SupabaseService } from './services/supabase.service.js';
  
  const client = SupabaseService.getClient();
  if (client) {
    // Use Supabase client
  } else {
    // Use mock data fallback
  }
  ```

### 4. **Updated Research Module**
- **File:** `src/modules/research/research.tools.ts`
- **Change:** Removed top-level Supabase initialization
- **New:** Imports `SupabaseService` for lazy loading
- **Benefit:** Prevents WebSocket errors during server startup

### 5. **Fixed Server Entry Point**
- **File:** `src/index.ts`
- **Change:** Replaced `console.error()` with `process.stderr.write()`
- **Reason:** `console.*` corrupts the MCP JSON-RPC protocol stream
- **Impact:** Ensures error messages don't break the MCP connection

---

## Deployment Steps

### Step 1: Update Dependencies
```bash
npm install
npm install --save-dev @types/ws
```

### Step 2: Verify TypeScript Compilation
```bash
npm run build
```

### Step 3: Test Locally
```bash
npm run dev
```

### Step 4: Deploy to Nitro Cloud
```bash
# Ensure Node.js 22+ is specified in your Nitro Cloud config
# Then deploy as usual
nitrostack-cli deploy
```

---

## Verification Checklist

After deployment, verify:

- [ ] Server starts without WebSocket errors
- [ ] All 25 tools are registered and callable
- [ ] Supabase connection works (if credentials provided)
- [ ] Mock data fallback works (if credentials missing)
- [ ] No `console.log` / `console.error` in server logs
- [ ] MCP protocol stream is clean (no JSON corruption)

---

## Environment Variables

Ensure these are set in your Nitro Cloud deployment:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# Supabase (optional - will use mock data if missing)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Node.js Runtime (Nitro Cloud)
NODE_VERSION=22
```

---

## Troubleshooting

### Issue: "WebSocket not found" still appears
**Solution:**
1. Verify `ws` package is installed: `npm ls ws`
2. Verify Node.js 22+ is running: `node --version`
3. Clear Nitro Cloud cache and redeploy

### Issue: Supabase connection fails
**Solution:**
1. Check credentials in `.env`
2. Verify `SUPABASE_URL` starts with `https://`
3. Check Supabase project is active
4. Tools will automatically fall back to mock data

### Issue: MCP protocol errors in logs
**Solution:**
1. Search for `console.log`, `console.error`, `console.warn` in `src/**/*.ts`
2. Replace with `ctx.logger.info()`, `ctx.logger.error()` (for tools/resources)
3. Or use `process.stderr.write()` for startup errors

---

## Architecture: Lazy-Loading Pattern

```
┌─────────────────────────────────────────┐
│  Server Startup (src/index.ts)          │
│  ✓ No Supabase initialization           │
│  ✓ No WebSocket errors                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Tool Called (e.g., search_papers)      │
│  ✓ Lazy-loads SupabaseService           │
│  ✓ Creates client with WebSocket        │
│  ✓ Falls back to mock data if needed    │
└─────────────────────────────────────────┘
```

---

## Files Modified

| File | Change | Reason |
|------|--------|--------|
| `package.json` | Added `ws` + `@types/ws` | WebSocket polyfill |
| `src/index.ts` | Replaced `console.error` | Prevent protocol corruption |
| `src/services/supabase.service.ts` | NEW | Lazy-load Supabase client |
| `src/modules/research/research.tools.ts` | Removed top-level init | Use lazy-loading service |

---

## Next Steps

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "fix: lazy-load Supabase with WebSocket polyfill for Nitro Cloud"
   ```

2. **Deploy:**
   ```bash
   nitrostack-cli deploy
   ```

3. **Monitor logs:**
   - Check Nitro Cloud dashboard for errors
   - Verify all tools are callable
   - Test with MCP Chat in Studio

---

## Support

If issues persist:
1. Check Nitro Cloud logs for detailed error messages
2. Verify Node.js version is 22+
3. Ensure all environment variables are set
4. Test locally with `npm run dev` first
