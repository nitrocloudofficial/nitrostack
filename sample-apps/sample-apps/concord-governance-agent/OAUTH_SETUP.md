# Complete OAuth 2.1 Setup Guide for NitroStack

This guide shows you **exactly** how to set up OAuth 2.1 authentication from scratch with **zero issues**.

## 🎯 What You'll Learn

- ✅ How to configure Auth0 correctly (avoiding common pitfalls)
- ✅ How to set up your MCP server environment
- ✅ How to test the complete OAuth flow in Studio
- ✅ How to troubleshoot common issues

---

## 🚀 Quick Start with Auth0 (10 Minutes)

### Why Auth0?
- ✅ **Free tier** (7,000 active users, no credit card)
- ✅ **Fastest setup** (10 minutes)
- ✅ **Best for testing** and learning
- ✅ **Production-ready** when you need it

---

## Step 1: Create Auth0 Account

1. Go to **[auth0.com/signup](https://auth0.com/signup)**
2. Sign up for free (choose "Personal" plan)
3. Complete email verification

---

## Step 2: Create Auth0 API (Protected Resource)

**⚠️ DO THIS FIRST!** The API represents your MCP server as a protected resource.

1. Go to **Applications** → **APIs** in Auth0 Dashboard
2. Click **"Create API"**
3. **Settings:**
   ```
   Name: MCP Server API
   Identifier: https://mcplocal
   Signing Algorithm: RS256
   ```
   
   **⚠️ CRITICAL NOTES:**
   - The **Identifier** can be any unique URI (doesn't need to be a real URL)
   - For development, use `https://mcplocal` (simple and clear)
   - For production, use your actual domain like `https://api.yourapp.com`
   - This **MUST** match your `RESOURCE_URI` in `.env` **EXACTLY**
   - **JWT Profile**: Select **RFC 9068** (OAuth 2.0 Access Token JWT Profile)
   - **RBAC**: You can leave this **disabled** for basic OAuth (only needed for role-based permissions)

4. Click **"Create"**

5. Go to **Permissions** tab
6. Add these scopes:
   ```
   Scope          Description
   -----          -----------
   read           Read access to resources
   write          Write/modify resources
   admin          Administrative operations
   ```

7. Click **"Add"** for each scope
8. **Save Changes**

---

## Step 3: Create Auth0 Application (OAuth Client)

**⚠️ Application Type Matters!** This is where many users get stuck.

1. Go to **Applications** → **Applications**
2. Click **"Create Application"**
3. **Settings:**
   ```
   Name: MCP Server OAuth
   Application Type: Regular Web Application  ← CRITICAL!
   ```
   
   **⚠️ WHY "Regular Web Application"?**
   - ❌ **NOT** "Single Page Application" (SPA) - Won't show in API authorization
   - ❌ **NOT** "Machine to Machine" - Different auth flow, not compatible with OpenAI Studio
   - ✅ **YES** "Regular Web Application" - Supports confidential clients with client secret

4. Click **"Create"**

5. Go to **Settings** tab and configure:

   **Allowed Callback URLs** (supports both dev and prod):
   ```
   http://localhost:3005/auth/callback,http://localhost:3000/auth/callback
   ```
   
   **Why both ports?**
   - `3005`: Dev mode (DiscoveryHttpServer handles OAuth callbacks)
   - `3000`: Prod mode (HttpServerTransport handles OAuth callbacks)

   **Allowed Logout URLs**:
   ```
   http://localhost:3005,http://localhost:3000
   ```

   **Allowed Web Origins**:
   ```
   http://localhost:3005,http://localhost:3000
   ```

6. Scroll down to **Advanced Settings**
7. Go to **Grant Types** tab:
   ```
   ✅ Authorization Code
   ✅ Refresh Token
   ❌ Implicit (disable - deprecated in OAuth 2.1)
   ❌ Client Credentials (not needed for this use case)
   ```

8. Go to **OAuth** tab:
   ```
   ✅ OIDC Conformant: ON (enabled)
   JsonWebToken Signature Algorithm: RS256
   ```

9. Go to **ID Token** tab:
   ```
   ❌ ID Token Encryption: NONE/Disabled
   ```
   
   **⚠️ CRITICAL:** If encryption is enabled, you'll receive JWE (encrypted) tokens instead of JWT tokens, which will fail validation!

10. **Save Changes**

11. **Copy these values** (you'll need them later):
    - **Domain** (e.g., `dev-abc123.us.auth0.com`)
    - **Client ID** (e.g., `aBc123XyZ...`)
    - **Client Secret** (click "Show" to reveal it)

---

## Step 4: Link Application to API

**⚠️ REQUIRED STEP!** Many users miss this.

1. Go back to **Applications** → **APIs**
2. Click on your **"MCP Server API"** (created in Step 2)
3. Click the **"Machine to Machine Applications"** tab
   
   **Note:** Despite the confusing name, this tab shows which applications can access your API

4. Find your **"MCP Server OAuth"** application in the list
5. **Toggle the switch to "Authorized"** (should turn green)
6. Click the **dropdown arrow** to expand permissions
7. **Select all scopes** you want to grant (`read`, `write`, `admin`)
8. Click **"Update"**

**✅ Verification:** Your application should now show as "Authorized" with selected scopes

---

## Step 5: Configure Your MCP Server

### Copy and Edit `.env` File

```bash
cp .env.example .env
```

Edit `.env` with your Auth0 settings:

```bash
# =============================================================================
# REQUIRED: Server Configuration
# =============================================================================

# ⚠️ MUST match Auth0 API Identifier from Step 2 EXACTLY
RESOURCE_URI=https://mcplocal

# Your Auth0 domain from Step 3 (with https://)
AUTH_SERVER_URL=https://dev-abc123.us.auth0.com

# =============================================================================
# OPTIONAL: Token Configuration
# =============================================================================

# Must match RESOURCE_URI
TOKEN_AUDIENCE=https://mcplocal

# Auth0 domain with trailing slash!
TOKEN_ISSUER=https://dev-abc123.us.auth0.com/
```

**⚠️ Important:**
- Replace `dev-abc123` with YOUR actual Auth0 domain
- `RESOURCE_URI` must match Auth0 API Identifier **EXACTLY** (case-sensitive!)
- `TOKEN_ISSUER` must have trailing slash `/`

---

## Step 6: Start Your MCP Server

```bash
npm install
npm run dev
```

**Expected Output:**
```
🚀 OAuth discovery server running at http://localhost:3005
NITRO_LOG::{"level":"info","message":"OAuthModule: Running in STDIO mode, starting DiscoveryHttpServer on port 3005"}
NITRO_LOG::{"level":"info","message":"🔐 OAuth 2.1 enabled"}
NITRO_LOG::{"level":"info","message":"   Resource URI: https://mcplocal"}
NITRO_LOG::{"level":"info","message":"   Auth Servers: https://dev-abc123.us.auth0.com"}
🚀 Server started successfully (DUAL: STDIO + HTTP)
📡 MCP Protocol: STDIO (for Studio/Claude)
🌐 OAuth Metadata: HTTP (port 3005)
```

**✅ Success!** Your server is running in DUAL mode:
- **STDIO**: For MCP protocol communication (tools, chat)
- **HTTP (3005)**: For OAuth metadata and discovery in dev mode

---

## Step 7: Test OAuth Flow in NitroStack Studio

### Open Studio

Navigate to **http://localhost:3000** in your browser

### 7.1 Discover OAuth Server

1. Go to **Auth** → **OAuth 2.1** tab
2. In the **"1. Discover Server Auth"** section:
   ```
   Server URL: http://localhost:3005
   ```
   **Note:** Port 3005 in dev mode (discovery server)

3. Click **"Discover Auth Config"**

**Expected Result:**
```
✅ Discovery successful!

Resource: https://mcplocal
Authorization Servers: https://dev-abc123.us.auth0.com
Scopes: read, write, admin
```

**✅ In Console, you should see:**
```
🎯 Setting audience parameter: https://mcplocal
```

**⚠️ This is CRITICAL!** The audience parameter tells Auth0 to issue a proper JWT access token for your API.

### 7.2 Enter Client Credentials

1. Scroll to **"2a. Use Existing Client"** section
2. Enter your credentials from Step 3:
   ```
   Client ID: [Your Auth0 Client ID]
   Client Secret: [Your Auth0 Client Secret]
   ```
3. Click **"Save Client Credentials"**

**Expected Result:**
```
✅ Client credentials saved!
```

### 7.3 Start OAuth Flow

1. Scroll to **"3. Start OAuth Flow"** section
2. Click **"Start Authorization Flow"**

**What Happens:**
1. ✅ You're redirected to Auth0 login page
2. ✅ Login with your Auth0 account (or test user)
3. ✅ You're asked to authorize the application
4. ✅ After authorization, you're redirected back to Studio
5. ✅ Studio exchanges the code for a JWT token
6. ✅ Token is automatically saved!

**Expected Result:**
```
✅ Authorization successful! Redirecting...
```

### 7.4 Verify Token Type (Debug Check)

**In your MCP server logs, you should see:**
```
[DEBUG] Token header: {"alg":"RS256","typ":"at+jwt","kid":"..."}
[DEBUG] Decoded payload: SUCCESS
[DEBUG] Payload audience: https://mcplocal
[DEBUG] Expected audience: https://mcplocal
```

**✅ Perfect!** You're getting **RS256 JWT tokens** (not encrypted JWE tokens)

**❌ If you see this instead:**
```
[DEBUG] Token header: {"alg":"dir","enc":"A256GCM",...}
[ERROR] Received JWE (encrypted) token instead of JWT!
```

**Fix:** Go back to Step 3 and disable ID Token Encryption in Application settings

### 7.5 Test Protected Tools

1. Go to **Tools** tab
2. Try a protected tool (e.g., `get_user_profile`, `list_resources`)
3. Click **"Execute"**

**Expected Result:**
```json
{
  "success": true,
  "user": {
    "sub": "auth0|xxx",
    "scopes": ["read", "write", "admin"],
    "clientId": "..."
  }
}
```

**🎉 Congratulations!** Your OAuth 2.1 server is fully working!

---

## 🔍 How It Works

### Dual Transport Architecture

NitroStack automatically runs **two transports simultaneously** when OAuth is enabled:

```
Development Mode:
┌─────────────────────────────────────┐
│   Your OAuth 2.1 MCP Server         │
├─────────────────────────────────────┤
│                                     │
│  📡 STDIO Transport                 │
│  ├─ MCP Protocol (tools, chat)      │
│  ├─ Connected to Studio/Claude      │
│  └─ stdin/stdout communication      │
│                                     │
│  🌐 DiscoveryHttpServer (Port 3005) │
│  ├─ OAuth Metadata Endpoints        │
│  ├─ /.well-known/oauth-protected-   │
│  │   resource                       │
│  ├─ /auth/callback                  │
│  └─ Discovery & Token Validation    │
│                                     │
└─────────────────────────────────────┘

Production Mode:
┌─────────────────────────────────────┐
│   Your OAuth 2.1 MCP Server         │
├─────────────────────────────────────┤
│                                     │
│  🌐 HttpServerTransport (Port 3000) │
│  ├─ MCP Protocol (SSE)              │
│  ├─ OAuth Metadata Endpoints        │
│  ├─ /.well-known/oauth-protected-   │
│  │   resource                       │
│  ├─ /auth/callback                  │
│  └─ All-in-one HTTP server          │
│                                     │
└─────────────────────────────────────┘
```

### OAuth Flow Sequence

```
1. Studio → Discover     → Your MCP Server (HTTP :3005 in dev)
                          ↓
                      Returns OAuth metadata
                      (includes resource URI for audience)
                          ↓
2. Studio → Authorize    → Auth0 Login Page
   (with audience param)  ↓
                      User logs in
                          ↓
3. Auth0 → Redirect      → Studio Callback (/auth/callback)
                          ↓
4. Studio → Exchange     → Auth0 Token Endpoint
   (code for token)       ↓
                      Receives RS256 JWT access token
                      (NOT encrypted JWE token!)
                          ↓
5. Studio → Execute Tool → Your MCP Server (STDIO)
           (with JWT)    ↓
                      Tool validates token & executes
```

**Key Point:** Studio now automatically includes the `audience` parameter when starting the OAuth flow, which ensures Auth0 issues proper JWT tokens.

---

## 🚨 Troubleshooting

### Issue: "Received JWE (encrypted) token instead of JWT!"

**Symptoms:**
```
[DEBUG] Token header: {"alg":"dir","enc":"A256GCM",...}
[ERROR] Received JWE (encrypted) token instead of JWT!
```

**Root Cause:** One of these:
1. ID Token Encryption is enabled in Application settings
2. Application type is wrong (SPA instead of Regular Web App)
3. Audience parameter not being sent (fixed in latest Studio version)

**Fix:**
1. Go to Applications → Your Application → Settings → Advanced Settings
2. Click **"ID Token"** tab
3. Ensure **"ID Token Encryption"** is **Disabled** or **None**
4. Click **"OAuth"** tab
5. Ensure **"OIDC Conformant"** is **ON**
6. **Save Changes**
7. Clear Studio's saved token and re-authorize

### Issue: "Application doesn't show in API's Machine to Machine tab"

**Root Cause:** Application type is "Single Page Application" instead of "Regular Web Application"

**Fix:**
1. Delete the current application
2. Create a new one with type **"Regular Web Application"**
3. Follow Step 3 again

### Issue: "Token audience mismatch"

**Symptoms:**
```
OAuth token validation failed: Token audience mismatch. 
Expected: https://mcplocal, Got: https://dev-abc123.us.auth0.com/api/v2/
```

**Root Cause:** `RESOURCE_URI` in `.env` doesn't match Auth0 API Identifier

**Fix:**
1. In Auth0: Applications → APIs → Your API → Settings → **Identifier**
2. Copy the exact identifier (e.g., `https://mcplocal`)
3. In `.env`: Set `RESOURCE_URI` to match **EXACTLY** (case-sensitive)
4. In `.env`: Set `TOKEN_AUDIENCE` to match **EXACTLY**
5. Restart your MCP server

### Issue: "Discovery failed" or "Cannot read properties of undefined"

**Root Cause:** Server URL is incorrect or server isn't running

**Fix:**
1. Verify server is running: Check for "🚀 OAuth discovery server running" in logs
2. Check URL is exactly: `http://localhost:3005` (dev mode)
3. Test metadata endpoint:
   ```bash
   curl http://localhost:3005/.well-known/oauth-protected-resource
   ```
   Should return:
   ```json
   {
     "resource": "https://mcplocal",
     "authorization_servers": ["https://dev-abc123.us.auth0.com"],
     "scopes_supported": ["read", "write", "admin"]
   }
   ```

### Issue: "Invalid token issuer"

**Root Cause:** `TOKEN_ISSUER` doesn't match token's `iss` claim

**Fix:**
1. Check Auth0 domain in dashboard
2. Add `https://` prefix
3. Add trailing `/` 
4. Example: `https://dev-abc123.us.auth0.com/` (note the slash!)

### Issue: "Insufficient scope"

**Root Cause:** Token doesn't have required scopes for the tool

**Fix:**
1. In Auth0: Applications → APIs → Your API → Machine to Machine Applications
2. Find your application and ensure it's **Authorized**
3. Click the dropdown and **select all required scopes**
4. Click **"Update"**
5. In Studio: Clear the saved token and re-authorize
6. New token will have updated scopes

### Issue: "Port 3005 already in use"

**Root Cause:** Previous server instance still running

**Fix:**
```bash
# Kill process on port 3005
lsof -ti :3005 | xargs kill -9

# Restart server
npm run dev
```

---

## 🌐 Other OAuth Providers

### Okta

```bash
RESOURCE_URI=https://mcp.yourapp.com
AUTH_SERVER_URL=https://your-domain.okta.com/oauth2/default
TOKEN_AUDIENCE=api://mcp.yourapp.com
TOKEN_ISSUER=https://your-domain.okta.com/oauth2/default
```

### Keycloak

```bash
RESOURCE_URI=https://mcp.yourapp.com
AUTH_SERVER_URL=https://keycloak.yourapp.com/realms/your-realm
TOKEN_AUDIENCE=mcp-server
TOKEN_ISSUER=https://keycloak.yourapp.com/realms/your-realm
```

### Azure AD / Entra ID

```bash
RESOURCE_URI=https://mcp.yourapp.com
AUTH_SERVER_URL=https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0
TOKEN_AUDIENCE=api://YOUR-APP-ID
TOKEN_ISSUER=https://login.microsoftonline.com/YOUR-TENANT-ID/v2.0
```

---

## 📚 Learn More

- [MCP OAuth Specification](https://modelcontextprotocol.io/specification/draft/basic/authorization)
- [OAuth 2.1 Draft](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13)
- [RFC 8707 - Resource Indicators](https://datatracker.ietf.org/doc/html/rfc8707)
- [RFC 9728 - Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [OpenAI Apps SDK - Auth](https://developers.openai.com/apps-sdk/build/auth)

---

## ✅ Pre-Flight Checklist

Before asking for help, verify:

- [ ] Auth0 API created with **RS256** signing algorithm
- [ ] Auth0 API **JWT Profile** set to **RFC 9068**
- [ ] Auth0 Application type is **"Regular Web Application"** (not SPA or M2M)
- [ ] Application has correct **callback URLs** (`http://localhost:3005/auth/callback`)
- [ ] Application **Grant Types** include "Authorization Code" and "Refresh Token"
- [ ] Application **ID Token Encryption** is **DISABLED**
- [ ] Application is **Authorized** to access the API (Machine to Machine Applications tab)
- [ ] Required **scopes** are granted to the application
- [ ] `.env` file has `RESOURCE_URI` matching Auth0 API Identifier **EXACTLY**
- [ ] `.env` file has `TOKEN_ISSUER` with **trailing slash** `/`
- [ ] Server starts successfully (check logs for "🚀 OAuth discovery server running")
- [ ] Discovery endpoint is accessible: `curl http://localhost:3005/.well-known/oauth-protected-resource`
- [ ] Discovery works in Studio (shows resource, auth servers, scopes)
- [ ] Client credentials saved in Studio
- [ ] OAuth flow completes successfully
- [ ] Server logs show **RS256 JWT tokens** (not JWE encrypted tokens)
- [ ] JWT token stored in Studio (check Auth tab)
- [ ] Protected tools execute successfully

**If all checkboxes are ✅ and it still doesn't work,** check the troubleshooting section above!

---

## 🎓 What We Learned (Common Pitfalls)

1. **Application Type Matters:** Must be "Regular Web Application", not SPA or M2M
2. **Audience Parameter is Critical:** Without it, Auth0 returns encrypted tokens (fixed in Studio)
3. **API Identifier Must Match:** `RESOURCE_URI` must **exactly** match Auth0 API Identifier
4. **Encryption Must Be Disabled:** ID Token encryption breaks JWT validation
5. **Trailing Slash Matters:** `TOKEN_ISSUER` must have trailing `/` for Auth0
6. **Authorization Required:** Application must be explicitly authorized to access the API
7. **Port Awareness:** Dev mode uses 3005, prod mode uses 3000

---

**Happy coding! 🚀**

If you have issues, check the troubleshooting section above. Most problems are solved by verifying the checklist!