import type WebSocket from "ws";
import { nanoid } from "nanoid";
// fixed
import { ServerPuzzle } from "./puzzle.js";

// Session Types:
export type SessionState = 'waiting' | 'playing' | 'finished';
export type PlayerSlot = 'left' | 'right';

export interface Player {
    /** Unique within a session. */
    id: string;
    ws: WebSocket;
    /** Which side of the board this player displays on. */
    slot: PlayerSlot;
    placed: number;
    solved: boolean;
    // time: number;
};

export interface Session {
    id: string;
    puzzle: ServerPuzzle;
    /** Solution will stay server-side, never send to clients. */
    players: Map<string, Player>;
    winner: string | null;
    state: SessionState;
    createdAt: number;
};

/**
 * Outcome of attempting to join a session. Split into explicit failure
 * reasons so the caller can send the right err message to the client
 * instead of collapsing everything into null.
 */
export type JoinRes =
    | { ok: true, session: Session; player: Player; isFirst: boolean }
    | { ok: false; reason: "not_found" | "full" | "finished"};


// SessionRegistry:
export class SessionRegistry {
    private readonly sessions = new Map<string, Session>();
    private readonly ttlMs: number;

    constructor(opts?: {ttlMs: number }) {
        this.ttlMs = opts!.ttlMs;
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
    join(id: string, ws: WebSocket): JoinRes {
        const sesh = this.sessions.get(id); // look up existing session via unique nanoid.

        if (!sesh) return { ok: false, reason: 'not_found' };
        if (sesh.state === 'finished') {
            // TODO
            return { ok: false, reason: 'finished' };
        }
        if (sesh.players.size >= 2) {
            // TODO
            return { ok: false, reason: 'full' };
        }

        const isFirst = sesh.players.size === 0;
        const slot: PlayerSlot = isFirst ? 'left' : 'right';
        let pid: string;
        do {
            pid = nanoid(8);
        } while (sesh.players.has(pid));

        const player: Player = {
            id: pid,
            ws,
            slot,
            placed: 0,
            solved: false,
        };

        sesh.players.set(pid, player);
        
        return {
            ok: true,
            session: sesh,
            player,
            isFirst
        }
    }

    /**
     * Removes a player from a session. When the last player leaves, the
     * session is deleted from the registry cleanly.
     */
    leave(id: string, pid: string) : void {
        const sesh = this.sessions.get(id);
        if (!sesh) return;

        sesh.players.delete(pid);
        if (sesh.players.size === 0) {
            this.sessions.delete(id);
        }
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
     * Close and remove sessions older than the TTL. Returns the number
     * that weren't pruned. Safe to call on some interval.
     */
    pruneStale(): number {
        const now = Date.now();
        let pruned = 0;

        for (const [id, sesh] of this.sessions) {
            if (now - sesh.createdAt <= this.ttlMs) continue;

            for (const player of sesh.players.values()) {
                try {
                    player.ws.close(1000, 'Session expired');
                } catch {
                    /* socket already closed; ignore */
                }
            }

            this.sessions.delete(id);
            ++pruned;
        }

        console.log(`[Server]: Pruned session count: ${pruned} at ${now}`);
        return pruned;
    }
}