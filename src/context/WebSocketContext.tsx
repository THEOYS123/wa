import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { WhatsAppSession } from '../types';
import { apiFetch } from '../utils/api';

export type EventCallback = (payload: any) => void;

interface WebSocketContextType {
  isConnected: boolean;
  session: WhatsAppSession | null;
  refreshSession: () => Promise<void>;
  addEventListener: (eventType: string, cb: EventCallback) => () => void;
  lastEventTime: string | null;
}

const WebSocketContext = createContext<WebSocketContextType>({
  isConnected: false,
  session: null,
  refreshSession: async () => {},
  addEventListener: () => () => {},
  lastEventTime: null,
});

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [session, setSession] = useState<WhatsAppSession | null>(null);
  const [lastEventTime, setLastEventTime] = useState<string | null>(null);

  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const data = await apiFetch<{ session: WhatsAppSession }>('/api/whatsapp/session');
      setSession(data.session);
    } catch (_) {}
  }, []);

  const addEventListener = useCallback((eventType: string, cb: EventCallback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(cb);

    return () => {
      listenersRef.current.get(eventType)?.delete(cb);
    };
  }, []);

  const emitEvent = (type: string, payload: any) => {
    setLastEventTime(new Date().toISOString());
    const handlers = listenersRef.current.get(type);
    if (handlers) {
      handlers.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in ws listener for ${type}:`, e);
        }
      });
    }
  };

  const connectWs = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        refreshSession();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connection:update') {
            setSession(data.payload);
          }
          if (data.type) {
            emitEvent(data.type, data.payload);
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (_) {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
    }
  }, [refreshSession]);

  useEffect(() => {
    refreshSession();
    connectWs();

    // Ping keepalive every 20s
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWs, refreshSession]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        session,
        refreshSession,
        addEventListener,
        lastEventTime,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
