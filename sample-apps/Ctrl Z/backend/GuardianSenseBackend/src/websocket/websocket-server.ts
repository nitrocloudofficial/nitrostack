import { WebSocketServer, WebSocket } from "ws";

export class GuardianWebSocketServer {
    private wss: WebSocketServer;
    private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    constructor(port = 8080) {
        this.wss = new WebSocketServer({ port });

        this.wss.on("connection", (socket) => {
            socket.on("error", (err) => {
                console.error(`WebSocket error: ${err.message}`);
            });
        });

        this.heartbeatTimer = setInterval(() => this.pruneDeadClients(), 30_000);
        this.heartbeatTimer.unref?.();

        console.log(`Guardian WebSocket running on ws://localhost:${port}`);
    }

    broadcast(data: unknown) {
        const message = JSON.stringify(data);

        this.wss.clients.forEach((client) => {
            if (client.readyState !== WebSocket.OPEN) {
                return;
            }
            try {
                client.send(message);
            } catch (err) {
                console.error(`WebSocket send error: ${(err as Error).message}`);
            }
        });
    }

    private pruneDeadClients() {
        for (const client of this.wss.clients) {
            if (client.readyState !== WebSocket.OPEN) {
                client.terminate();
            }
        }
    }

    get clientCount(): number {
        return this.wss.clients.size;
    }

    close() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
        for (const client of this.wss.clients) {
            client.terminate();
        }
        this.wss.close();
    }
}
