import * as http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { WebSocket, WebSocketServer } from "ws";

import { send } from "./handlers";
import rateLimit from "express-rate-limit";

const allowedOrigins: string[] = [
    'https://kfukutom.github.io/shikaku/',
    'TODO'
]

const app = express();
app.use(helmet());

// move to single cors call
app.use(
    cors({
        origin: (origin, cb) => {
            if (!origin || allowedOrigins.includes(origin)) {
                return cb(null, true);
            }

            cb(new Error("CORS rejected"));
        },
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Tye", "Authorization"],
        credentials: true,
    })
);

app.use(express.json({
    limit: "1kb"
}));

// rate limit the create endpoint
app.use(
    '/create',
    rateLimit({
        windowMs: 60_000,
        max: 10,
        standardHeaders: true,
    })
);

const PORT = Number(process.env.PORT) || 3001;


// Route definition
app.post('/create', (req, res) => {
    const sessionId = nanoid(10);
    const puzzle = "TODO"; // generate puzzle;

    // create a new session:

    res.json({
        sessionId,
        puzzle,
    });
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

    maxPayload: 4 * 1024, // 4kb
});

const connectionPerIp = new Map<string, number>();
const MAX_CHANNEL = 5;

wss.on('connection', (ws: WebSocket, req) => {

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ??
        req.socket.remoteAddress ?? "unknown";
    
    console.log(ip);
    const current = connectionPerIp.get(ip) ?? 0;

    if (current >= MAX_CHANNEL) {
        send(ws, {type: 'error', message: 'Too many connections'});
        ws.close();
        return;
    }

    connectionPerIp.set(ip, current+1);
    ws.on('close', () => {
        const n = (connectionPerIp.get(ip) ?? 1) - 1;
        if (n <= 0) connectionPerIp.delete(ip);
        else connectionPerIp.set(ip, n);
    });

    // revised validation of url path
    const match = req.url?.match(/^\/duel\/([A-Za-z0-9_-]{1,20})$/);
    if (!match) {
        send(ws, { type: 'error', message: 'Invalid URL'});
        ws.close();
        return;
    }

    const session = 'TODO';
    if (!session) {
        send(ws, { type: 'error', message: 'Session not found' });
        ws.close();
        return;
    }

    const pid = nanoid(6);
    const player = pid; // TODO

    let alive = true;
    ws.on('pong', () => (alive = true));
    const heartbeat = setInterval(() => {
        if (!alive) {
            ws.terminate();
            clearInterval(heartbeat);
            return;
        } else {
            alive = false;
            ws.ping();
        }
    }, 30_000);

    ws.on('close', () => clearInterval(heartbeat));
});


// Start
server.listen(PORT, () => {
    console.log(`Shikaku duel server running on: ${String(PORT!)}`);
});