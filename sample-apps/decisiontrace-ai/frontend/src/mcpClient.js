export class McpClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.eventSource = null;
    this.postUrl = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
    this.onConnect = null;
    this.onDisconnect = null;
    this.isConnected = false;
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[MCP Client] Connecting to SSE at ${this.baseUrl}/sse`);
        this.eventSource = new EventSource(`${this.baseUrl}/sse`);
        
        this.eventSource.addEventListener("endpoint", (event) => {
          this.postUrl = new URL(event.data, this.baseUrl).toString();
          this.isConnected = true;
          console.log(`[MCP Client] Connected. POST endpoint set to: ${this.postUrl}`);
          if (this.onConnect) this.onConnect();
          resolve();
        });

        this.eventSource.addEventListener("message", (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log(`[MCP Client] Received message:`, data);
            
            if (data.id && this.pendingRequests.has(data.id)) {
              const { resolve, reject } = this.pendingRequests.get(data.id);
              this.pendingRequests.delete(data.id);
              
              if (data.error) {
                reject(new Error(data.error.message || "MCP execution error"));
              } else {
                resolve(data.result);
              }
            }
          } catch (err) {
            console.error("[MCP Client] Failed to parse message event data:", err);
          }
        });

        this.eventSource.onerror = (err) => {
          console.error("[MCP Client] SSE connection error or closed:", err);
          this.isConnected = false;
          if (this.onDisconnect) this.onDisconnect();
          reject(err);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async callTool(toolName, args) {
    if (!this.isConnected || !this.postUrl) {
      throw new Error("MCP Client is not connected to the server. Please check if the backend is running.");
    }

    const id = this.messageId++;
    const promise = new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    try {
      console.log(`[MCP Client] Sending request ID ${id} to call tool: ${toolName}`, args);
      const response = await fetch(this.postUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      this.pendingRequests.delete(id);
      throw err;
    }

    return promise;
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.postUrl = null;
    this.isConnected = false;
    if (this.onDisconnect) this.onDisconnect();
    console.log("[MCP Client] Disconnected");
  }
}
