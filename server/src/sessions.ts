import type WebSocket from "ws";
import type { Bounds, Clue } from "@tiles/core";

export interface Player {
    id: string;
    ws: WebSocket;
    slot: 'left' | 'right'; // represents display on screen
    placed: number;
    solved: boolean;
    // time: number;
};

export interface Session {
    id: string;
    puzzle: {
        rows: number;
        cols: number;
        clues: Clue[];
        // kept as serverside component, never send to client
        solution: Bounds[];
        tileCount: number;
    };
    players: Map<string, Player>;
    winner: string | null;
    state: 'waiting' | 'playing' | 'finished';
    createdAt: number;
};

// all the active sessions keyed by session ID
const rooms = new Map<string, Session>();
const TTL: number = 60 * 60 * 500;

export function createRoom(id: string, puzzle: Session['puzzle']) : Session {
    const session: Session = {
        id,
        puzzle,
        players: new Map(),
        winner: null,
        state: 'waiting',
        createdAt: Date.now(),
    };

    //console.log(session.state);
    rooms.set(
        id, session
    );
    
    return session;
}

export function getRoom(id: string): Session | null {
    return rooms.get(id) ?? null;
}

export function deleteRoom(id: string): void {
    rooms.delete(id);
}

export function joinRoom(session: Session, playerId: string, ws: WebSocket) : Player | null {
    if (session.players.size >= 2) return null;
    if (session.state === 'finished') return null;

    const slot = session.players.size === 0 ? 'left' : 'right';

    const player: Player = {
        id: playerId,
        ws,
        slot,
        placed: 0,
        solved: false,
    };

    session.players.set(
        playerId, player
    );

    //console.log(session.players);
    return player;
}

export function leaveRoom(session: Session, playerId: string) : void {
    sessionStorage.players.delete(playerId);

    if (session.players.size === 0) {
        deleteRoom(session.id);
    }
}

export function getOpponent(session: Session, playerId: string): Player | null {
    for (const [id, player] of session.players) {
        if (id !== playerId) return player;
    }
    return null;
}

export function isFull(session: Session): boolean {
    return session.players.size >= 2;
}

export function pruneStaleRooms(): void {
    const now = Date.now();
    for (const [id, session] of rooms) {
        if (now - session.createdAt > TTL) {
            for (const player of session.players.values()) {
                player.ws.close();
            }

            rooms.delete(id);
        }
    }
}