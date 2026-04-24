import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Bounds, Tile } from "@tiles/core";

import { useSocket } from "../hooks/useSocket";
import type { ServerMessage, PuzzlePayload } from "../hooks/useDuelTypes";

// Components
import GameBoard from "../components/GameBoard";
import OpponentBoard from "../components/OpponentBoard";
//import Countdown from "../components/Countdown";

interface OpponentTile {
    tileId: string;
    bounds: Bounds;
    color: string;
}

type DuelState = "connecting" | "waiting" | "playing" | "finished" | "countdown";
type Result = "you" | "opponent" | null;

const EMPTY_SOLUTION: Tile[] = [];

export default function Battle() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();

    const [duelState, setDuelState] = useState<DuelState>("connecting");
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [puzzle, setPuzzle] = useState<PuzzlePayload | null>(null);
    const [opponentTiles, setOpponentTiles] = useState<OpponentTile[]>([]);
    const [opponentProgress, setOpponentProgress] = useState({ placed: 0, total: 0 });
    const [result, setResult] = useState<Result>(null);
    const [disconnected, setDisconnected] = useState(false);

    const [copied, setCopied] = useState(false);
    //const [startsAt, setStartsAt] = useState<number | null>(null);

    const handleServerMessage = useCallback((msg: ServerMessage) => {
        switch (msg.type) {
            case "waiting":
                setDuelState("waiting");
                break;

            case "start":
                setPuzzle(msg.puzzle);
                //setDuelState("playing");

                // add another time buffer to allow user to settle in
                // e.g., a simple game count down

                setDuelState("countdown");
                setDisconnected(false);
                setOpponentTiles([]);
                setOpponentProgress({
                    placed: 0,
                    total: 0,
                });
                break;

            case "opponent_placed":
                setOpponentTiles(prev => [...prev, {
                    tileId: msg.tileId,
                    bounds: msg.bounds,
                    color: msg.color,
                }]);
                break;

            case "opponent_evict":
                setOpponentTiles(prev => prev.filter(t => t.tileId !== msg.tileId));
                break;

            case "opponent_progress":
                setOpponentProgress({ placed: msg.placed, total: msg.total });
                break;

            case "result":
                setResult(msg.winner);
                setDuelState("finished");
                break;

            case "opponent_disconnected":
                setDisconnected(true);
                break;

            case "error":
                console.error("server:", msg.message);
                if (duelState === "connecting") {
                    setSessionError(msg.message);
                }
                break;

            default: {
                const _: never = msg;
                console.error("unhandled message", _);
            }
        }
    }, [duelState]);

    const { sendPlace, sendEvict, sendSolved } = useSocket(sessionId, handleServerMessage);

    const gameOver = duelState === "finished";

    // no session ID in the URL
    if (!sessionId) {
        return (
            <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center">
                <p className="text-stone-500 text-sm">Missing session ID.</p>
            </div>
        );
    }

    //if (duelState === "countdown" && startsAt !== null) {
    //    return (
    //        <Countdown startsAt={startsAt} onComplete={() => setDuelState("playing")}/>
    //    );
    //}

    // server rejected the connection
    if (sessionError) {
        return (
            <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-4">
                <p className="text-stone-400 text-sm">{sessionError}</p>
                <button
                    onClick={() => navigate("/duel")}
                    className="text-xs tracking-widest uppercase text-stone-600
                               hover:text-stone-400 transition-colors duration-200
                               cursor-pointer"
                >
                    ← Create a new game
                </button>
            </div>
        );
    }

    // connecting or waiting for opponent
    if (duelState === "connecting" || duelState === "waiting") {
        return (
            <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-6">
                <h1 className="text-xl font-bold tracking-widest uppercase">
                    {duelState === "connecting" ? "Connecting..." : "Waiting for opponent"}
                </h1>

                {duelState === "waiting" && (
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-stone-500 text-xs tracking-wide">
                            Share this link
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="text-xs text-stone-400 bg-stone-800 border border-stone-700 px-3 py-2 rounded">
                                {window.location.href}
                            </code>

                            {/* Copied module */}
                            <button
                                onClick={() => {
                                    const text: string = String(window.location.href);
                                    navigator.clipboard.writeText(text);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 7000);
                                }}
                                className="text-xs tracking-widest uppercase text-stone-500
                                        hover:text-stone-300 transition-colors duration-200
                                        cursor-pointer px-2 py-1"
                            >
                                {copied ? "Copied!" : "Copy"}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => navigate("/duel")}
                    className="text-xs tracking-widest uppercase text-stone-600
                               hover:text-stone-400 transition-colors duration-200
                               cursor-pointer mt-4"
                >
                    ← Back
                </button>
            </div>
        );
    }

    // game in progress or finished
    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-6 p-4">

            <div className="flex flex-col items-center gap-1">
                <h1 className="text-xl font-bold tracking-widest uppercase">Duel</h1>

                {disconnected && !gameOver && (
                    <p className="text-red-400 text-xs tracking-wide">Opponent disconnected</p>
                )}

                {!gameOver && !disconnected && (
                    <p className="text-stone-600 text-xs tracking-wide">
                        Don't refresh, your progress will be lost.
                    </p>
                )}
            </div>

            {puzzle && (
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">

                    {/* your board */}
                    <div className="flex flex-col items-center gap-2">
                        <p className={`text-xs tracking-widest uppercase
                            ${gameOver && result === "you" ? "text-stone-300" : "text-stone-500"}`}>
                            You {gameOver && result === "you" ? "· Winner" : ""}
                        </p>
                        <div className={gameOver ? "opacity-80 pointer-events-none" : ""}>
                            <GameBoard
                                rows={puzzle.rows}
                                cols={puzzle.cols}
                                solution={EMPTY_SOLUTION}
                                clues={puzzle.clues}
                                onSolve={sendSolved}
                                onPlace={sendPlace}
                                onEvict={sendEvict}
                                disabled={gameOver}
                            />
                        </div>
                    </div>

                    {/* opponent board */}
                    <div className="flex flex-col items-center gap-2">
                        <p className={`text-xs tracking-widest uppercase
                            ${gameOver && result === "opponent" ? "text-stone-300" : "text-stone-500"}`}>
                            Opponent {gameOver && result === "opponent" ? "· Winner" : ""}
                            {!gameOver && opponentProgress.total > 0
                                ? ` · ${opponentProgress.placed}/${opponentProgress.total}`
                                : ""}
                        </p>
                        <OpponentBoard
                            rows={puzzle.rows}
                            cols={puzzle.cols}
                            clues={puzzle.clues}
                            tiles={opponentTiles}
                        />
                    </div>
                </div>
            )}

            {gameOver && (
                <div className="flex flex-col items-center gap-4 animate-fade-up">
                    <p className="text-stone-300 text-sm tracking-wide">
                        {result === "you" ? "You won!" : "Opponent won, lock in bruh."}
                    </p>
                    <div className="flex gap-6">
                        <button
                            onClick={() => navigate("/duel")}
                            className="text-xs tracking-widest uppercase text-stone-500
                                       hover:text-stone-300 transition-colors duration-200
                                       cursor-pointer"
                        >
                            New Game
                        </button>
                        <a
                            href="/shikaku/"
                            className="text-xs tracking-widest uppercase text-stone-500
                                       hover:text-stone-300 transition-colors duration-200"
                        >
                            Solo Mode
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}