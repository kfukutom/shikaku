import * as http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";

import { send, startGame, handleMessage, handleDisconnect } from "./handlers";
import { generatePuzzle } from "./puzzle";
import { createRoom, getRoom, joinRoom, leaveRoom, isFull, pruneStaleRooms } from "./sessions";
import rateLimit from "express-rate-limit";

const allowedOrigins: string[] = [
    'https://kfukutom.github.io',
    'http://localhost:5173',
    'http://localhost:5174',
];

const app = express();
app.use(helmet());

app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return cb(null, true);
            }

            cb(new Error("CORS rejected"));
        },
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true,
    })
);

app.use(express.json({
    limit: "1kb"
}));

app.use(
    '/create',
    rateLimit({
        windowMs: 60_000,
        max: 10,
        standardHeaders: true,
    })
);

const PORT = Number(process.env.PORT) || 3001;


/**
 * Creates a new duel room and returns the session ID.
 * Puzzle is generated server-side so neither client can see the solution.
 */
app.post('/create', (req, res) => {
    const { rows = 6, cols = 6, minArea = 2, maxArea = 8 } = req.body;
    const sessionId = nanoid(10);
    const puzzle = generatePuzzle(rows, cols, minArea, maxArea);

    createRoom(sessionId, puzzle);

    // only return the session ID — puzzle is sent over WS when both players join
    res.json({ sessionId });
});

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});


// Websocket:
const server = http.createServer(app);
const wss = new WebSocketServer({
    server,
    verifyClient: ({ origin }, done) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return done(true);
        }

        done(false, 403, "Origin not allowed");
    },

    maxPayload: 4 * 1024,
});

const connectionPerIp = new Map<string, number>();
const MAX_CHANNEL = 20;

wss.on('connection', (ws: WebSocket, req) => {

    // per-IP throttle
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
        req.socket.remoteAddress ?? "unknown";

    const current = connectionPerIp.get(ip) ?? 0;

    if (current >= MAX_CHANNEL) {
        send(ws, { type: 'error', message: 'Too many connections' });
        ws.close();
        return;
    }

    connectionPerIp.set(ip, current + 1);

    // validate url path — expecting /duel/{sessionId}
    const match = req.url?.match(/^\/duel\/([A-Za-z0-9_-]{1,20})$/);
    if (!match) {
        send(ws, { type: 'error', message: 'Invalid URL' });
        ws.close();
        return;
    }

    // session lookup
    const session = getRoom(match[1]);
    if (!session) {
        send(ws, { type: 'error', message: 'Session not found' });
        ws.close();
        return;
    }

    // join the room — null means it's full
    const playerId = nanoid(6);
    const player = joinRoom(session, playerId, ws);
    if (!player) {
        send(ws, { type: 'error', message: 'Room is full' });
        ws.close();
        return;
    }

    // first player waits, second triggers game start
    if (!isFull(session)) {
        send(ws, { type: 'waiting', sessionId: session.id });
    } else {
        startGame(session);
    }

    // heartbeat — detects dead connections that didn't close cleanly
    let alive = true;
    ws.on('pong', () => (alive = true));
    const heartbeat = setInterval(() => {
        if (!alive) {
            ws.terminate();
            return;
        }
        alive = false;
        ws.ping();
    }, 30_000);

    // message routing
    ws.on('message', (data) => {
        handleMessage(session, player, data.toString());
    });

    // cleanup on disconnect
    ws.on('close', () => {
        clearInterval(heartbeat);

        const n = (connectionPerIp.get(ip) ?? 1) - 1;
        if (n <= 0) connectionPerIp.delete(ip);
        else connectionPerIp.set(ip, n);

        handleDisconnect(session, playerId);
        leaveRoom(session, playerId);
    });
});


// prune stale rooms every 5 minutes
setInterval(pruneStaleRooms, 5 * 60 * 1000);

server.listen(PORT, () => {
    console.log(`Shikaku duel server running on: ${PORT}`);
});