// Define the one-to-one relationship of client/server messages:
import { Bounds, Clue } from "@tiles/core";

// Server to Client
export type ServerMessage =
    | { type: "waiting" }
    | { type: "start", puzzle: { rows: number; cols: number; } }
    | { type: "opponent_disconnected" }
    | { type: "error", message: string };

// Client to Server
export type ClientMessage =
    | { type: "place"; bounds: Bounds }
    | { type: "evict"; tileId: string }
    | { type: "solved" };

// puzzle data sent to the clients, solution stays server side (no cheats)
export interface PuzzlePayload {
    rows: number;
    cols: number;
    clues: Clue[];
}