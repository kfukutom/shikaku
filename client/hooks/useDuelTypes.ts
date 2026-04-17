import type { Bounds, Clue } from "@tiles/core";

export interface PuzzlePayload {
    rows: number;
    cols: number;
    clues: Clue[];
}

export type ServerMessage =
    | { type: "waiting"; sessionId: string }
    | { type: "start"; puzzle: PuzzlePayload; playerSlot: "left" | "right" }
    | { type: "opponent_placed"; bounds: Bounds; tileId: string; color: string }
    | { type: "opponent_evict"; tileId: string }
    | { type: "opponent_progress"; placed: number; total: number }
    | { type: "result"; winner: "you" | "opponent" }
    | { type: "opponent_disconnected" }
    | { type: "error"; message: string };