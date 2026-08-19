import * as http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import rateLimit from "express-rate-limit";

// fixed
import {
    send,
    sendStart,
    sendResult,
    startGame,
    handleMessage,
    handleDisconnect,
    resetPlayerProgress,
} from "./handlers.js";
import { generatePuzzle } from "./puzzle.js";
import { SessionRegistry } from "./sessions.js";
import { CreateRoomSchema } from "./schemas.js";
import { logMessage, assertNever } from "./helper/helper.js";

// Configs:
const PORT = Number(process.env.PORT) || 3001;
const ROOM_TTL_MS = 60 * 60 * 1000;
const FINISHED_TTL_MS = 5 * 60 * 1000; // dead rooms shouldn't squat for the full hour
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_CONNECTIONS_PER_IP = 20;
const DUEL_PATH = /^\/duel\/([A-Za-z0-9_-]{1,20})$/;
const PLAYER_ID = /^[A-Za-z0-9_-]{8,64}$/;
const RECONNECT_GRACE_MS = 15_000;

const allowedOrigins: string[] = [
    'https://kfukutom.github.io',
    ...(process.env.NODE_ENV !== 'production'
        ? ['http://localhost:5173']
        : []),
];


// State:
const sessions = new SessionRegistry({
    ttlMs: ROOM_TTL_MS,
    reconnectGraceMs: RECONNECT_GRACE_MS,
    finishedTtlMs: FINISHED_TTL_MS,
});
const connectionsPerIp = new Map<string, number>();


// HTTP:
const app = express();
app.use(helmet());

// Railway terminates TLS and forwards x-forwarded-for. Without this the rate
// limiter keys every request to the proxy's address instead of the real client.
app.set('trust proxy', 1);

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return cb(null, true);
            }

            // 500
            cb(null, false);
        },
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    })
);

app.use(express.json({
    limit: '1kb'
}));

app.use(
    '/create',
    rateLimit({
        windowMs: 60_000,
        limit: 10,
        standardHeaders: true,
    })
);

/**
 * Create a new duel room and return its session id.
 * The puzzle is generated server-side.
 */
app.post('/create', (req, res) => {
    const parsed = CreateRoomSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
        // generation is CPU-bound and synchronous, so bad dimensions have to
        // be rejected before they ever reach the generator
        const issue = parsed.error.issues[0];
        res.status(400).json({
            error: issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : 'Invalid request',
        });
        return;
    }

    const { rows, cols, minArea, maxArea } = parsed.data;

    let puzzle;
    try {
        puzzle = generatePuzzle(rows, cols, minArea, maxArea);
    } catch (err) {
        // the generator gives up after a bounded number of backtracking attempts
        logMessage(`[Server] puzzle generation failed: ${(err as Error).message}`, 'error');
        res.status(503).json({ error: 'Could not generate a puzzle, try again' });
        return;
    }

    const sesh = sessions.create(puzzle);

    res.json({
        sessionId: sesh.id
    });
});

app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        rooms: sessions.size,
    });
})


// Websocket:
const server = http.createServer(app);
const wss = new WebSocketServer({
    server,
    verifyClient: ({ origin }, done) => {
        if (!origin || allowedOrigins.includes(origin)) return done(true);
        done(false, 403, "Origin not allowed");
    },
    maxPayload: 4 * 1024,
});

wss.on('connection', (ws: WebSocket, req) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
        req.socket.remoteAddress ?? "unknown";

    // idepotent per-connection cleanup
    let released = false;
    let heartbeat: NodeJS.Timeout | null = null;
    const release = () => {
        if (released) return;
        released = true;
        if (heartbeat) clearInterval(heartbeat);
        const n = (connectionsPerIp.get(ip) ?? 1) - 1;
        if (n <= 0) connectionsPerIp.delete(ip);
        else connectionsPerIp.set(ip, n);
    };

    const fail = (message: string, code = 1008) => {
        try { send(ws, { type: 'error', message }); } catch { /* socket may be gone */ }
        try { ws.close(code, message); } catch { /* idempotent */ }
        release();
    };

    ws.on('error', (err) => {
        logMessage(`[Server] ws error from ${ip}: ${err.message}`, 'error');
    });

    const current = connectionsPerIp.get(ip) ?? 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
        try { send(ws, { type: 'error', message: 'Too many connections' }); } catch {}
        ws.close(1008, 'Too many connections');
        return;
    }
    connectionsPerIp.set(ip, current + 1);

    // Parse URL. `new URL` throws on malformed input.
    let match_game_url: RegExpMatchArray | null;
    let playerId: string | null = null;

    try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        logMessage(`[Server] URL received as ${String(url)}`, 'log');
        match_game_url = url.pathname.match(DUEL_PATH);
        playerId = url.searchParams.get('playerId');
    } catch (err) {
        logMessage(`[Server] URL parse failed: ${(err as Error).message}`, 'error');
        fail('Invalid URL');
        return;
    }

    if (!match_game_url) {
        fail('Invalid URL');
        return;
    }

    if (!playerId || !PLAYER_ID.test(playerId)) {
        fail('Invalid or missing playerId');
        return;
    }

    // Atomic join.
    let joinResult: ReturnType<typeof sessions.join>;
    try {
        joinResult = sessions.join(match_game_url[1], ws, playerId);
    } catch (err) {
        logMessage(`[Server] sessions.join threw: ${(err as Error).message}`, 'error');
        fail('Server error', 1011);
        return;
    }

    if (!joinResult.ok) {
        const messages = {
            not_found: "Session not found!",
            full: "Room is full!",
            finished: "Game already finished!",
        } as const;
        fail(messages[joinResult.reason]);
        return;
    }
    const { session, player, isFirst, reconnected } = joinResult;

    /**
     * Every path below has to put a message on the wire. The client opens on a
     * "Connecting..." screen and only leaves it when the server says something,
     * so any silent branch strands the player with no way back to the lobby.
     */
    try {
        if (reconnected) {
            // returning player --> re-send whatever they need to rebuild the UI
            switch (session.state) {
                case 'playing': {
                    // their board comes back empty, so drop the progress the
                    // server was holding and clear the opponent's mirror too
                    resetPlayerProgress(session, player, sessions.opponentOf(session, player.id));
                    sendStart(session, player);
                    break;
                }

                case 'finished': {
                    // the duel ended while they were away; show the outcome
                    // rather than a board they can no longer play
                    sendResult(session, player);
                    break;
                }

                case 'waiting': {
                    send(ws, { type: 'waiting', sessionId: session.id });
                    break;
                }

                default: {
                    assertNever(session.state);
                }
            }
        } else if (isFirst) {
            send(ws, { type: 'waiting', sessionId: session.id });
        } else if (session.state === 'waiting') {
            logMessage(`[Server] All players have arrived, starting game for ${session.id}`, 'log');
            startGame(session);
        } else if (session.state === 'playing') {
            sendStart(session, player);
        } else {
            // join() rejects newcomers to a finished room, so this is unreachable
            // in practice — but never leave a connected client with nothing.
            fail('Game already finished!');
            return;
        }
    } catch (err) {
        logMessage(`[Server] error during game start: ${(err as Error).message}`, 'error');
        if (!reconnected) {
            sessions.leave(session.id, player.id);
            fail('Server error', 1011);
            return;
        }
    }


    let alive = true;
    ws.on('pong', () => { alive = true; });
    heartbeat = setInterval(() => {
        if (!alive) {
            // stop pinging a socket we're about to kill; 'close' handles the rest
            if (heartbeat) clearInterval(heartbeat);
            ws.terminate();
            return;
        }
        alive = false;
        try { ws.ping(); } catch { /* socket gone, terminate will follow */ }
    }, HEARTBEAT_INTERVAL_MS);

    ws.on('message', (data) => {
        try {
            handleMessage(sessions, session, player, data.toString());
        } catch (err) {
            // One malformed message shouldn't kill the connection.
            logMessage(`[Server] handleMessage threw: ${(err as Error).message}`, 'error');
        }
    });

    ws.on('close', () => {
        // this connection is done either way — free its slot and heartbeat
        release();

        const current = session.players.get(player.id);
        if (current?.ws !== ws) {
            logMessage(`[Server] stale ws closed for ${player.id}; skipping cleanup`, 'log');
            return;
        }

        logMessage(`[Server] ws closed at ${new Date().toISOString()}`, 'log');
        try {
            /**
             * Hold the seat rather than tearing the room down. A refresh gets
             * back in before the grace expires, and the opponent never sees a
             * blip — so `opponent_disconnected` now means genuinely gone.
             */
            sessions.beginReconnectGrace(session.id, player.id, () => {
                handleDisconnect(session, sessions.opponentOf(session, player.id));
            });
        } catch (err) {
            logMessage(`[Server] error during close cleanup: ${(err as Error).message}`, 'error');
        }

    });
});
 
setInterval(() => sessions.pruneStale(), PRUNE_INTERVAL_MS);
 
server.listen(PORT, '0.0.0.0', () => {
    logMessage(`[Server]: Shikaku duel server listening on ${PORT}`, 'log');
});