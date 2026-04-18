import * as http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import rateLimit from "express-rate-limit";

import { send, startGame, handleMessage, handleDisconnect } from "./handlers.js";
import { generatePuzzle } from "./puzzle.js";
import { SessionRegistry } from "./sessions.js";

// Configs:
const PORT = Number(process.env.PORT) || 3001;
const ROOM_TTL_MS = 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_CONNECTIONS_PER_IP = 20;
const DUEL_PATH = /^\/duel\/([A-Za-z0-9_-]{1,20})$/;

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
 
    const current = connectionsPerIp.get(ip) ?? 0;
    if (current >= MAX_CONNECTIONS_PER_IP) {
        send(ws, { type: 'error', message: 'Too many connections' });
        ws.close();
        return;
    }
    connectionsPerIp.set(ip, current + 1);
 
    /** Decrement once, on any exit path. */
    let released = false;
    const releaseIp = () => {
        if (released) return;
        released = true;
        const n = (connectionsPerIp.get(ip) ?? 1) - 1;
        if (n <= 0) connectionsPerIp.delete(ip);
        else connectionsPerIp.set(ip, n);
    };
 
    const match = req.url?.match(DUEL_PATH);
    if (!match) {
        send(ws, { type: 'error', message: 'Invalid URL' });
        ws.close();
        releaseIp();
        return;
    }
 
    // Atomic Join: one synchronous call handles existence, capacity, and state checks.
    const joinResult = sessions.join(match[1], ws);
    if (!joinResult.ok) {
        const messages = {
            not_found: "Session not found",
            full: "Room is full",
            finished: "Game already finished",
        } as const;
        send(ws, { type: 'error', message: messages[joinResult.reason] });
        ws.close();
        releaseIp();
        return;
    }
    const { session, player, isFirst } = joinResult;
 
    // First player waits; the second's arrival starts the game.
    if (isFirst) {
        send(ws, { type: 'waiting', sessionId: session.id });
    } else {
        startGame(session);
    }
 
    // Detects dead connections that didn't close cleanly. Worst-case
    // detection is 2 x heartbeat interval (ms).
    let alive = true;
    ws.on('pong', () => { alive = true; });
    const heartbeat = setInterval(() => {
        if (!alive) {
            ws.terminate();
            return;
        }
        alive = false;
        ws.ping();
    }, HEARTBEAT_INTERVAL_MS);
 
    ws.on('message', (data) => {
        handleMessage(sessions, session, player, data.toString());
    });
 
    ws.on('close', () => {
        clearInterval(heartbeat);
        releaseIp();
 
        // Capture the opponent BEFORE removing ourselves so handleDisconnect
        // can notify them. Order matters here.
        const opponent = sessions.opponentOf(session, player.id);
        handleDisconnect(session, opponent);
        sessions.leave(session.id, player.id);
    });
});
 
setInterval(() => sessions.pruneStale(), PRUNE_INTERVAL_MS);
 
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Shikaku duel server listening on ${PORT}`);
});