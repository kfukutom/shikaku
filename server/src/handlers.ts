import type { ServerMessage } from "./types";
import { WebSocket } from "ws";

/** Send a typed message to a single player. */
export function send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}