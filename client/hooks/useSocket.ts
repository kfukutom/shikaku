import { useEffect, useRef, useCallback, useState } from "react";
import type { ServerMessage } from "./useDuelTypes";

type MessageHandler = (msg: ServerMessage) => void;

const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";
console.log(`[Client] Development Serverl URL: ${SERVER_URL}`) // added a log for deployment
const WS_URL = SERVER_URL.replace(/^http/, "ws");

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

        let playerId = sessionStorage.getItem(`shikaku_player_id`);
        if (!playerId) {
            playerId = crypto.randomUUID();
            sessionStorage.setItem(`shikaku_player_id`, playerId);
        }

        let cancelled = false;
        //const socket = new WebSocket(`${WS_URL}/duel/${sessionId}`);
        const socket = new WebSocket(`${WS_URL}/duel/${sessionId}?playerId=${playerId}`);
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
                console.error("[Client] Bad message received from server");
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

    const sendPlace = useCallback((tileId: string, bounds: { row: number; col: number; width: number; height: number }) => {
        ws.current?.send(JSON.stringify({ type: "place", tileId, bounds }));
    }, []);

    const sendEvict = useCallback((tileId: string) => {
        ws.current?.send(JSON.stringify({ type: "evict", tileId }));
    }, []);

    const sendSolved = useCallback(() => {
        ws.current?.send(JSON.stringify({ type: "solved" }));
    }, []);

    return { connected, sendPlace, sendEvict, sendSolved };
}