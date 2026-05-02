import * as http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import rateLimit from "express-rate-limit";

// fixed
import { send, startGame, handleMessage, handleDisconnect } from "./handlers.js";
import { generatePuzzle } from "./puzzle.js";
import { SessionRegistry } from "./sessions.js";
import { logMessage } from "./helper/helper.js";
import { connect } from "http2";
import { start } from "repl";

// Configs:
const PORT = Number(process.env.PORT) || 3001;
const ROOM_TTL_MS = 60 * 60 * 1000;
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
    ttlMs: ROOM_TTL_MS
});
const connectionsPerIp = new Map<string, number>();


// HTTP:
const app = express();
app.use(helmet());

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
        max: 10,
        standardHeaders: true,
    })
);

/**
 * Create a new duel room and return its session id.
 * The puzzle is generated server-side.
 */
app.post('/create', (req, res) => {
    const { rows = 6, cols = 6, minArea = 2, maxArea = 8 } = req.body;
    const puzzle = generatePuzzle(rows, cols, minArea, maxArea);
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

    try {
        if (reconnected) {
            // returning player --> re-send whatever they need to rebuild the UI
            const opponent = sessions.opponentOf(session, player.id);

            if (session.state === 'playing') {
                send(ws, {
                    type: 'start',
                    puzzle: {
                        rows: session.puzzle.rows,
                        cols: session.puzzle.cols,
                        clues: session.puzzle.clues,
                        gameStartTime: session.createdAt,
                    },
                    playerSlot: player.slot,
                });
            } else if (session.state === 'waiting') {
                send(ws, { type: 'waiting', sessionId: session.id });
            }
        } else if (isFirst) {
            send(ws, { type: 'waiting', sessionId: session.id });
        } else if (session.state === 'waiting') {
            logMessage(`[Server] All players have arrived, starting game for ${session.id}`, 'log');
            startGame(session);
        } else if (session.state === 'playing') {
            send(ws, {
                type: 'start',
                puzzle: {
                    rows: session.puzzle.rows,
                    cols: session.puzzle.cols,
                    clues: session.puzzle.clues,
                    gameStartTime: session.createdAt,
                },
                playerSlot: player.slot,
            });
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

        const current = session.players.get(player.id);
        if (current?.ws !== ws) {
            logMessage(`[Server] stale ws closed for ${player.id}; skipping cleanup`, 'log');
            return;
        }

        logMessage(`[Server] ws closed at ${new Date().toISOString()}`, 'log');
        try {
            const opponent = sessions.opponentOf(session, player.id);
            handleDisconnect(session, opponent);
            sessions.leave(session.id, player.id);
        } catch (err) {
            logMessage(`[Server] error during close cleanup: ${(err as Error).message}`, 'error');
        }

    });
});
 
setInterval(() => sessions.pruneStale(), PRUNE_INTERVAL_MS);
 
server.listen(PORT, '0.0.0.0', () => {
    logMessage(`[Server]: Shikaku duel server listening on ${PORT}`, 'log');
});