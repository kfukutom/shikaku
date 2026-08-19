import type { ServerMessage, ClientMessage } from "./types.js";
import type { Bounds } from "@tiles/core";
import { createTile } from "@tiles/core";
import { WebSocket } from "ws";

// fixed
import type { Player, Session, SessionRegistry } from "./sessions.js";
import { ClientMessageSchema } from "./schemas.js";
import { validatePlacement } from "./validation.js";
import { assertNever } from "./helper/helper.js";

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

/** Push the current progress of `player` to their opponent. */
function sendProgress(session: Session, player: Player, opponent: Player | null): void {
    if (!opponent) return;

    sendTo(opponent, {
        type: 'opponent_progress',
        placed: player.tiles.size,
        total: session.puzzle.tileCount,
    });
}

//Game Start
/**
 * Hand a player everything they need to render the board. Used both on a
 * normal start and when a returning player rejoins a game already running.
 */
export function sendStart(session: Session, player: Player): void {
    sendTo(player, {
        type: 'start',
        puzzle: {
            rows: session.puzzle.rows,
            cols: session.puzzle.cols,
            clues: session.puzzle.clues,
            // the countdown UI needs to know when the clock actually started
            gameStartTime: session.startedAt ?? session.createdAt,
        },
        playerSlot: player.slot,
    });
}

/** called when the SECOND player joins, sends the puzzle to both connected clients. */
export function startGame(session: Session): void {
    session.state = 'playing';
    session.startedAt = Date.now();

    for (const player of session.players.values()) {
        sendStart(session, player);
    }
}

/**
 * Replay the outcome to a player who rejoined after the game already ended.
 * Without this they'd get silence and sit on the connecting screen forever,
 * with no way back to the lobby.
 */
export function sendResult(session: Session, player: Player): void {
    if (!session.winner) return;

    sendTo(player, {
        type: 'result',
        winner: session.winner === player.id ? 'you' : 'opponent',
    });
}

/**
 * Wipe a reconnecting player's server-side progress and bring the opponent's
 * mirrored view back in line. The returning client rebuilds from an empty
 * board, so anything still held here would desync the two.
 */
export function resetPlayerProgress(session: Session, player: Player, opponent: Player | null): void {
    for (const tileId of player.tiles.keys()) {
        if (opponent) {
            sendTo(opponent, { type: 'opponent_evict', tileId });
        }
        player.board.evict(tileId);
    }

    player.tiles.clear();
    player.solved = false;

    sendProgress(session, player, opponent);
}

// Message Router
export function handleMessage(sessions: SessionRegistry, session: Session, player: Player, raw: string) : void {
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
                message: 'Invalid message format'
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
    const opponent = sessions.opponentOf(session, player.id);

    switch (msg.type) {
        case 'place': {
            handlePlace(session, player, opponent, msg.tileId, msg.bounds);
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
            sendTo(player,
                {
                    type: 'error',
                    message: 'Unknown message type'
                }
            );
            assertNever(msg);
        }
    }
}

// Individual Handlers

/**
 * A placement is only accepted once it clears every rule the client also
 * enforces locally. The client is untrusted, so the server keeps its own
 * Board per player and re-derives the result from scratch.
 */
function handlePlace(
    session: Session,
    player: Player,
    opponent: Player | null,
    tileId: string,
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

    if (player.tiles.has(tileId)) {
        sendTo(player, { type: 'error', message: 'Tile already placed' });
        return;
    }

    // one clue, one rectangle. n is bounded by the tile count (<= 144), so
    // scanning beats keeping a second index in sync.
    for (const clueId of player.tiles.values()) {
        if (clueId === check.clue.tileId) {
            sendTo(player, { type: 'error', message: 'Clue already solved' });
            return;
        }
    }

    // Board owns the overlap rule; canPlace covers bounds + occupancy.
    const tile = createTile(tileId, bounds);
    if (!player.board.place(tile)) {
        sendTo(player, { type: 'error', message: 'Overlaps an existing tile' });
        return;
    }

    player.tiles.set(tileId, check.clue.tileId);

    // broadcast to opponent so their board updates in real time
    if (opponent) {
        sendTo(opponent, {
            type: 'opponent_placed',
            bounds,
            tileId,
            color: OPPONENT_COLOR,
        });
    }

    sendProgress(session, player, opponent);

    // the server decides when the puzzle is done, not the client
    if (isSolved(session, player)) {
        declareWinner(session, player, opponent);
    }
}

function handleEvict(
    session: Session,
    player: Player,
    opponent: Player | null,
    tileId: string,
) : void {
    // evict() returns an empty array for an id that was never placed, which
    // is how a bogus or duplicate evict gets ignored instead of skewing progress
    const cleared = player.board.evict(tileId);
    if (cleared.length === 0) return;

    player.tiles.delete(tileId);

    if (opponent) {
        sendTo(opponent, {
            type: 'opponent_evict',
            tileId,
        });
    }

    sendProgress(session, player, opponent);
}

/**
 * True once the player has covered every clue and left no empty cell.
 * Both halves matter: the clue count alone would accept a board with gaps.
 */
function isSolved(session: Session, player: Player): boolean {
    return player.tiles.size === session.puzzle.tileCount && player.board.isFull();
}

function declareWinner(
    session: Session,
    player: Player,
    opponent: Player | null,
) : void {
    player.solved = true;
    session.winner = player.id;
    session.state = 'finished';

    sendTo(player, { type: 'result', winner: 'you' });

    if (opponent) {
        sendTo(opponent, { type: 'result', winner: 'opponent' });
    }
}

function handleSolved(
    session: Session,
    player: Player,
    opponent: Player | null,
) : void {
    // ignore duplicate solve messages or if someone already won
    if (session.winner || player.solved) return;

    // a client claiming victory proves nothing; check our own board
    if (!isSolved(session, player)) {
        sendTo(player, { type: 'error', message: 'Board is not solved' });
        return;
    }

    declareWinner(session, player, opponent);
}

// Disconnect
export function handleDisconnect(session: Session, opponent: Player | null) : void {
    if (opponent && session.state !== 'finished') {
        sendTo(opponent, { type: 'opponent_disconnected' });
    }
}