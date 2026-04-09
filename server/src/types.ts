export type ServerMessage =
    | { type: "waiting" }
    | { type: "start", puzzle: { rows: number; cols: number; } }
    | { type: "opponent_disconnected" }
    | { type: "error", message: string };