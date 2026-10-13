# How to Verify Studio Transport Mode

This guide shows you **5 different ways** to verify whether Studio is using HTTP or STDIO transport to communicate with your MCP server.

---

## 🔍 Method 1: Visual Indicator (Easiest)

Look at the **bottom-left sidebar** in Studio:

```
┌──────────────────────┐
│ Transport: HTTP      │  ← Shows current mode
│ Change in Settings   │
└──────────────────────┘
```

- **HTTP** = Using HTTP transport (port 3002)
- **STDIO** = Using standard input/output

---

## 🔍 Method 2: Browser Console Logs (Most Detailed)

Open **DevTools Console** (F12 or Cmd+Option+I):

### **HTTP Transport Logs:**
```
🔌 Connecting to SSE endpoint: http://localhost:3002/mcp/sse?clientId=...
SSE connection established
MCP Client connected and ready (HTTP transport)
📤 Sending message to server: {method: "tools/list", ...}
📨 Received message from server: {result: {...}}
```

### **STDIO Transport Logs:**
```
MCP Client connected and ready (STDIO transport)
```

---

## 🔍 Method 3: Browser Network Tab (Most Reliable)

Open **DevTools Network Tab** (F12 → Network):

### **If using HTTP:**
You'll see:
1. **SSE Connection**: `GET /mcp/sse?clientId=...` (type: `eventsource`, status: `200`)
2. **Message Requests**: `POST /mcp/message` (multiple requests as you interact)

Filter by `mcp` to see only MCP-related requests.

### **If using STDIO:**
You'll see **NO requests** to `/mcp/sse` or `/mcp/message`.

---

## 🔍 Method 4: Browser LocalStorage

Open **DevTools Console** and run:

```javascript
localStorage.getItem('mcp_transport')
```

**Output:**
- `"http"` → Using HTTP transport ✅
- `"stdio"` or `null` → Using STDIO transport

---

## 🔍 Method 5: MCP Server Logs

Check your **MCP server console** output:

### **If using HTTP:**
```
NitroStack Server started successfully
   📡 Transport: HTTP
   🌐 HTTP Server: http://0.0.0.0:3002
   📋 Endpoints:
      • SSE: http://0.0.0.0:3002/mcp/sse
      • Messages: http://0.0.0.0:3002/mcp/message
```

You'll also see connection logs:
```
New SSE connection established for client: client_1234567890_abc123
Received MCP message: {"method":"tools/list",...}
```

### **If using STDIO:**
```
NitroStack Server started successfully
   📡 Transport: STDIO
   📋 Listening on: stdin/stdout
```

---

## 📋 Quick Verification Checklist

| Check | HTTP Transport | STDIO Transport |
|-------|---------------|-----------------|
| Sidebar shows | `HTTP` | `STDIO` |
| Console log | `HTTP transport` | `STDIO transport` |
| Network tab | Has `/mcp/sse` & `/mcp/message` | No MCP requests |
| LocalStorage | `"http"` | `"stdio"` or `null` |
| Server uses port | `3002` | No port (stdin/stdout) |

---

## 🔄 How to Switch Transports

### **Switch to HTTP:**
1. Go to **Settings** page in Studio
2. Select **HTTP Transport**
3. Enter URL: `http://localhost:3002`
4. Click **Save & Connect**
5. Verify using methods above

### **Switch to STDIO:**
1. Go to **Settings** page in Studio
2. Select **STDIO Transport**
3. Enter command: `node dist/index.js`
4. Click **Save & Connect**
5. Verify using methods above

---

## Recommended Method for Developers

For **development and debugging**, use **Method 2 (Console Logs)** + **Method 3 (Network Tab)** together:

1. Open DevTools Console (F12)
2. Switch to Network tab
3. Filter by `mcp`
4. Perform an action (e.g., list tools)
5. Check both console logs and network requests

This gives you the **most comprehensive view** of what's happening.

---

## Troubleshooting

### "Transport shows HTTP but no network requests"

**Possible causes:**
- Studio is caching the old connection
- Refresh the page (Cmd/Ctrl + R)
- Clear browser cache and localStorage

### "Transport shows STDIO but console says HTTP"

**Possible causes:**
- LocalStorage not updated after switching
- Run in console: `localStorage.setItem('mcp_transport', 'stdio')`
- Refresh the page

### "Can't see any logs"

**Solution:**
- Make sure Console is set to show **all levels** (not just errors)
- Check that Console isn't filtered

---

## 📚 Related Documentation

- [Dual Transport Guide](./dual-transport.md)
- [HTTP Transport Implementation](../../src/studio/lib/http-client-transport.ts)
- [STDIO Transport Implementation](../../src/studio/lib/mcp-client.ts)

---

**Last Updated:** October 30, 2025

