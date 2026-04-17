import { useEffect, useRef, useCallback, useState } from "react";
import type { ServerMessage } from "./useDuelTypes";

type MessageHandler = (msg: ServerMessage) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3001";

export function useSocket(sessionId: string | undefined, onMessage: MessageHandler) {
    const ws = useRef<WebSocket | null>(null);
    const onMessageRef = useRef(onMessage);
    const [connected, setConnected] = useState(false);

    // keep the callback ref fresh without re-triggering the socket effect
    useEffect(() => {
        onMessageRef.current = onMessage;
    });

    useEffect(() => {
        if (!sessionId) return;

        let cancelled = false;
        const socket = new WebSocket(`${WS_URL}/duel/${sessionId}`);
        ws.current = socket;

        socket.onopen = () => {
            if (!cancelled) setConnected(true);
        };

        socket.onmessage = (e) => {
            if (cancelled) return;
            try {
                const msg: ServerMessage = JSON.parse(e.data);
                onMessageRef.current(msg);
            } catch {
                console.error("bad message from server");
            }
        };

        socket.onclose = () => {
            if (!cancelled) {
                setConnected(false);
                ws.current = null;
            }
        };

        return () => {
            cancelled = true;
            socket.close();
            ws.current = null;
        };
    }, [sessionId]);

    const sendPlace = useCallback((bounds: { row: number; col: number; width: number; height: number }) => {
        ws.current?.send(JSON.stringify({ type: "place", bounds }));
    }, []);

    const sendEvict = useCallback((tileId: string) => {
        ws.current?.send(JSON.stringify({ type: "evict", tileId }));
    }, []);

    const sendSolved = useCallback(() => {
        ws.current?.send(JSON.stringify({ type: "solved" }));
    }, []);

    return { connected, sendPlace, sendEvict, sendSolved };
}