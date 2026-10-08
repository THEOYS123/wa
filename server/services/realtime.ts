import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HTTPServer } from 'http';

export interface RealtimeEvent {
  type:
    | 'connection:update'
    | 'message:new'
    | 'message:deleted'
    | 'status:new'
    | 'view_once:saved'
    | 'media:saved'
    | 'notification:new'
    | 'log:new'
    | 'storage:update'
    | 'chat:update';
  payload: any;
  timestamp: string;
}

class RealtimeService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  public init(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      // Send initial welcome & ack
      ws.send(
        JSON.stringify({
          type: 'connected',
          timestamp: new Date().toISOString(),
          message: 'Connected to WhatsApp Realtime Engine',
        })
      );

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          }
        } catch (_) {}
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', () => {
        this.clients.delete(ws);
      });
    });
  }

  public broadcast(type: RealtimeEvent['type'], payload: any) {
    const event: RealtimeEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    const json = JSON.stringify(event);

    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(json);
        } catch (err) {
          console.error('Error broadcasting to client:', err);
        }
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const realtime = new RealtimeService();
