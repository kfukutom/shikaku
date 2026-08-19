import type WebSocket from "ws";
import { nanoid } from "nanoid";
import { Board } from "@tiles/core";
// fixed
import { ServerPuzzle } from "./puzzle.js";
import { logMessage } from "./helper/helper.js";

// Session Types:
export type SessionState = 'waiting' | 'playing' | 'finished';
export type PlayerSlot = 'left' | 'right';

export interface Player {
    /** Unique within a session. */
    id: string;
    ws: WebSocket;
    /** Which side of the board this player displays on. */
    slot: PlayerSlot;
    /**
     * Server-side mirror of what this player has actually placed. Same Board
     * abstraction the client drives through useBoard, so overlap and occupancy
     * rules come from @tiles/core rather than being re-implemented here.
     */
    board: Board;
    /** Client tileId -> the clue tileId that placement covers. */
    tiles: Map<string, string>;
    solved: boolean;
    // time: number;
    reconnectGrace: NodeJS.Timeout | null;
};

export interface Session {
    id: string;
    puzzle: ServerPuzzle;
    /** Solution will stay server-side, never send to clients. */
    players: Map<string, Player>;
    winner: string | null;
    state: SessionState;
    /** Fixed at creation. TTL pruning measures against this. */
    createdAt: number;
    /** Set when the second player arrives; drives the client countdown. */
    startedAt: number | null;
};

/**
 * Outcome of attempting to join a session. Split into explicit failure
 * reasons so the caller can send the right err message to the client
 * instead of collapsing everything into null.
 */
export type JoinRes =
    | { ok: true; session: Session; player: Player; isFirst: boolean; reconnected: false }
    | { ok: true; session: Session; player: Player; isFirst: false; reconnected: true }
    | { ok: false; reason: "not_found" | "full" | "finished" };

export interface RegistryOptions {
    /** How long a session lives before pruneStale() reaps it. */
    ttlMs: number;
    /** How long a dropped player keeps their seat before being removed. */
    reconnectGraceMs: number;
    /**
     * Shorter TTL for rooms whose game already ended. Nobody can play in one
     * again, so they shouldn't squat memory for the full ttlMs.
     */
    finishedTtlMs: number;
}


// SessionRegistry:
export class SessionRegistry {
    private readonly sessions = new Map<string, Session>();
    private readonly ttlMs: number;
    private readonly reconnectGraceMs: number;
    private readonly finishedTtlMs: number;

    constructor(opts: RegistryOptions) {
        this.ttlMs = opts.ttlMs;
        this.reconnectGraceMs = opts.reconnectGraceMs;
        this.finishedTtlMs = opts.finishedTtlMs;
    }

    /** Number of active sessions. */
    get size(): number {
        return this.sessions.size;
    }

    /** Look up a session by `id` key; returns null if none exists. */
    get (id: string) : Session | null {
        return (this.sessions.get(id)) ?? null;
    }

    /**
     * Create a new session with freshly generated unique id.
     * Starts in the `waiting` state with obviously zero players.
     */
    create(puzzle: Session['puzzle']): Session {
        let id: string;
        do {
            id = nanoid(10);
        } while (this.sessions.has(id));

        const sesh: Session = {
            id,
            puzzle,
            players: new Map(),
            winner: null,
            state: 'waiting',
            createdAt: Date.now(),
            startedAt: null,
        };

        this.sessions.set(
            id, sesh
        );

        return sesh;
    }

    /**
     * Attempt to place a new player into a session. Existence, capacity,
     * and game-state checks all happen in one synchronous pass. So there
     * exists no window for two joins to race past the capacity check.
     */
    join(id: string, ws: WebSocket, playerId: string): JoinRes {
        const sesh = this.sessions.get(id); // look up existing session via unique nanoid.

        if (!sesh) return { ok: false, reason: 'not_found' };
        const existing = sesh.players.get(playerId);
        if (existing) {
            if (existing.reconnectGrace) {
                clearTimeout(existing.reconnectGrace);
                existing.reconnectGrace = null;
            }
            const oldWs = existing.ws;
            existing.ws = ws;
            if (oldWs !== ws && oldWs.readyState === oldWs.OPEN) {
                try {
                    oldWs.close(1000, 'reconnected');
                } catch {}
            }

            /**
             * Note: the caller must follow up with resetPlayerProgress() from
             * handlers.ts. The returning client remounts with an empty
             * GameBoard, so the server-side mirror has to be wiped to match —
             * but the opponent needs the old tile ids to clear their view
             * first, so the wipe can't happen here.
             */
            logMessage(`[Server] player ${playerId} reconnected to ${id}`, 'log');
            return {
                ok: true,
                session: sesh,
                player: existing,
                isFirst: false,
                reconnected: true,
            }
        }
        if (sesh.state === 'finished') {
            return { ok: false, reason: 'finished' };
        }
        if (sesh.players.size >= 2) {
            return { ok: false, reason: 'full' };
        }

        const isFirst = sesh.players.size === 0;
        const slot: PlayerSlot = isFirst ? 'left' : 'right';

        const player: Player = {
            id: playerId,
            ws,
            slot,
            board: new Board(sesh.puzzle.rows, sesh.puzzle.cols),
            tiles: new Map(),
            solved: false,
            reconnectGrace: null,
        };

        sesh.players.set(playerId, player);

        return {
            ok: true,
            session: sesh,
            player,
            isFirst,
            reconnected: false,
        }
    }

    /**
     * Hold a dropped player's seat open for the grace window instead of
     * evicting them the instant their socket closes. A refresh reconnects
     * before this fires; a real disconnect lets it run, which removes the
     * player and invokes `onExpire` so the caller can notify the opponent.
     */
    beginReconnectGrace(id: string, pid: string, onExpire: () => void): void {
        const sesh = this.sessions.get(id);
        if (!sesh) return;

        const player = sesh.players.get(pid);
        if (!player) return;

        if (player.reconnectGrace) clearTimeout(player.reconnectGrace);

        player.reconnectGrace = setTimeout(() => {
            player.reconnectGrace = null;
            this.leave(id, pid);
            onExpire();
        }, this.reconnectGraceMs);

        logMessage(`[Server] player ${pid} dropped; holding seat in ${id}`, 'log');
    }

    /**
     * Removes a player from a session. When the last player leaves, the
     * session is deleted from the registry cleanly.
     */
    leave(id: string, pid: string): void {
        const sesh = this.sessions.get(id);
        if (!sesh) return;
        const player = sesh.players.get(pid);
        if (player?.reconnectGrace) clearTimeout(player.reconnectGrace);
        sesh.players.delete(pid);
        if (sesh.players.size === 0) this.sessions.delete(id);
        logMessage('Player has left the room.', 'log');
    }

    /**
     * Return the other player in a session, or null if there exists none.
     */
    opponentOf(sesh: Session, pid: string) : Player | null {
        for (const [id, player] of sesh.players) {
            if (id !== pid) return player;
        }

        return null;
    }

    /** True once both player slots are filled. */
    isFull(session: Session): boolean {
        return session.players.size >= 2;
    }

    /**
     * Close and remove sessions past their TTL. Finished rooms expire on the
     * shorter clock since they can never be played again. Returns how many
     * were pruned. Safe to call on some interval.
     */
    pruneStale(): number {
        const now = Date.now();
        let pruned = 0;

        for (const [id, sesh] of this.sessions) {
            const ttl = sesh.state === 'finished' ? this.finishedTtlMs : this.ttlMs;
            if (now - sesh.createdAt <= ttl) continue;

            for (const player of sesh.players.values()) {
                if (player.reconnectGrace) clearTimeout(player.reconnectGrace);
                try {
                    player.ws.close(1000, 'Session expired');
                } catch {
                    /* socket already closed; ignore */
                }
            }

            this.sessions.delete(id);
            ++pruned;
        }

        if (pruned > 0) {
            logMessage(`[Server]: Pruned session count: ${pruned} at ${now}`, 'log');
        }

        return pruned;
    }
}