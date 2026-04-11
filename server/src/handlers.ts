import type { ServerMessage, ClientMessage } from "./types";
import type { Bounds } from "@tiles/core";
import { WebSocket } from "ws";

import { getOpponent, type Player, type Session } from "./sessions";
import { ClientMessageSchema } from "./schemas";
import { validatePlacement } from "./validation";

const OPPONENT_COLOR = "rgba(168, 162, 150, 0.35)";

/** Send a typed message to a single player. */
export function send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

function sendTo(player: Player, msg: ServerMessage) : void {
    send(player.ws, msg);
}

//Game Start
/** called whent he SECOND player joins, sends the puzzle to both connected clients. */
export function startGame(session: Session): void {
    session.state = 'playing';

    for (const player of session.players.values()) {
        // send puzzle here:
        sendTo(player, {
            type: 'start',
            puzzle: {
                rows: session.puzzle.rows,
                cols: session.puzzle.cols,
                clues: session.puzzle.clues,
            },
            playerSlot: player.slot,
        });
    }
}

// Message Router
export function handleMessage(session: Session, player: Player, raw: string) : void {
    let parsed;
    try {
        parsed = ClientMessageSchema.safeParse(
            JSON.parse(raw)
        );
    } catch {
        sendTo(player,
            {
                type: 'error',
                message: 'Malformed JSON'
            }
        );
        return;
    }

    if (!parsed.success) {
        sendTo(player,
            {
                type: 'error',
                message: 'Invalid mesage format'
            }
        );

        return;
    }

    // Game would HAVE to be in progress at this point:
    if (session.state !== 'playing') {
        sendTo(player,
            {
                type: 'error',
                message: 'Game not in progress',
            }
        );
        return;
    }

    const msg: ClientMessage = parsed.data;
    const opponent = getOpponent(session, player.id);
    //console.log(`[${player.id}] ${msg.type}`, msg);

    switch (msg.type) {
        case 'place': {
            handlePlace(session, player, opponent, msg.bounds);
            break;
        }
        
        case 'evict': {
            handleEvict(session, player, opponent, msg.tileId);
            break;
        }

        case 'solved': {
            handleSolved(session, player, opponent);
            break;
        }

        default: {
            // never case
            const exhaust: never = msg;
            sendTo(player,
                {
                    type: 'error',
                    message: 'Unknown message type'
                }
            );
        }
    }
}

// Individual Handlers

function handlePlace(
    session: Session,
    player: Player,
    opponent: Player | null,
    bounds: Bounds,
) : void {
    const check = validatePlacement(
        session.puzzle.rows,
        session.puzzle.cols,
        session.puzzle.clues,
        bounds,
    );

    if (!check.valid) {
        sendTo(player,
            {
                type: 'error',
                message: check.error
            }
        );
        return;
    }

    player.placed++;
    const tileId = `opp-${player.id}-${player.placed}`;

    // broadcast to opponent so their board updates in real time
    if (opponent) {
        sendTo(opponent, {
            type: 'opponent_placed',
            bounds,
            tileId,
            color: OPPONENT_COLOR,
        });

        sendTo(opponent, {
            type: 'opponent_progress',
            placed: player.placed,
            total: session.puzzle.tileCount,
        });
    }
}

function handleEvict(
    session: Session,
    player: Player,
    opponent: Player | null,
    tileId: string,
) : void {
    player.placed = Math.max(0, player.placed - 1);

    if (opponent) {
        sendTo(opponent, {
            type: 'opponent_evict',
            tileId,
        });

        sendTo(opponent, {
            type: 'opponent_progress',
            placed: player.placed,
            total: session.puzzle.tileCount,
        });
    }
}

function handleSolved(
    session: Session,
    player: Player,
    opponent: Player | null,
) : void {
    // ignore duplicate solve messages or if someone already won
    if (session.winner || player.solved) return;

    player.solved = true;
    session.winner = player.id;
    session.state = 'finished';

    sendTo(player, { type: 'result', winner: 'you' });

    if (opponent) {
        sendTo(opponent, { type: 'result', winner: 'opponent' });
    }
}

// Disconnect
export function handleDisconnect(session: Session, playerId: string) : void {
    const opponent = getOpponent(session, playerId);

    if (opponent && session.state !== 'finished') {
        sendTo(opponent, { type: 'opponent_disconnected' });
    }
}