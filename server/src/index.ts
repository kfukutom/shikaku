import * as http from "http";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import { WebSocket, WebSocketServer } from "ws";

import { send } from "./handlers";

const allowedOrigins: string[] = [
    'https://kfukutom.github.io/shikaku/',
    'TODO'
]

const app = express();
app.use(cors());
app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
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
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket, req) => {
    const match = req.url?.match(/^\/battle\/(.+)$/);
    console.log(match);

    if (!match) {
        send(ws, { type: "error", message: "Invalid URL" });
        ws.close();
        return;
    }

    // Sessions
    const session = "temp"; // TODO
    if (!session) {
        send(ws, { type: "error", message: "Session full" });
        ws.close();
        return;
    }

    const pid = nanoid(6);
    const player = pid; // TODO
    if (!player) {
        send(ws, { type: "error", message: "Session full" });
        ws.close();
        return;
    }
});

// Start
server.listen(PORT, () => {
    console.log(`Shikaku duel server running on: ${String(PORT!)}`);
})