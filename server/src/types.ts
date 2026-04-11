// Define the one-to-one relationship of client/server messages:
import { Bounds, Clue } from "@tiles/core";

// puzzle data sent to the clients, solution stays server side (no cheats)
export interface PuzzlePayload {
    rows: number;
    cols: number;
    clues: Clue[];
}

// Server to Client
export type ServerMessage =
    | { type: "waiting" }
    | { type: "start", puzzle: PuzzlePayload, playerSlot: 'left' | 'right'}
    | { type: "opponent_placed", bounds: Bounds; tileId: string; color: string }
    | { type: "opponent_evict"; tileId: string }
    | { type: "opponent_progress"; placed: number; total: number }
    | { type: "result"; winner: "you" | "opponent" }
    | { type: "opponent_disconnected" }
    | { type: "error", message: string };

// Client to Server
export type ClientMessage =
    | { type: "place"; bounds: Bounds }
    | { type: "evict"; tileId: string }
    | { type: "solved" };