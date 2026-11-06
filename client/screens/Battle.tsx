import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Bounds, Tile } from "@tiles/core";

import { useSocket } from "../hooks/useSocket";
import type { ServerMessage, PuzzlePayload } from "../hooks/useDuelTypes";

// Components
import GameBoard from "../components/GameBoard";
import OpponentBoard from "../components/OpponentBoard";
import Countdown from "../components/Countdown";
import NavBar from "../components/NavBar";
import PrimaryBtn from "../components/PrimaryBtn";

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
    const [startTime, setStartTime] = useState(0);

    const [copied, setCopied] = useState(false);
    //const [startsAt, setStartsAt] = useState<number | null>(null);

    const handleServerMessage = useCallback((msg: ServerMessage) => {
        switch (msg.type) {
            case "waiting":
                setDuelState("waiting");
                break;

            case "start":
                setPuzzle(msg.puzzle);
                setStartTime(msg.puzzle.gameStartTime);

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
                //setDuelState('waiting');
                break;

            case "error":
                console.error("[Server]:", msg.message);
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

    const page = "min-h-dvh bg-canvas text-label flex flex-col items-center justify-center gap-6 px-4 pt-13 pb-8";

    // no session ID in the URL
    if (!sessionId) {
        return (
            <div className={page}>
                <NavBar back={{ href: "/shikaku/duel", label: "Duel" }} />
                <p className="text-[15px] text-label-secondary">Missing session ID.</p>
            </div>
        );
    }

    // utilizing the date time object; create a start time countdown buffer
    if (duelState === "countdown" && startTime) {
        return (
            <div className={page}>
                <Countdown startsAt={startTime} onComplete={() => setDuelState("playing")}/>
            </div>
        );
    }

    // server rejected the connection
    if (sessionError) {
        return (
            <div className={page}>
                <NavBar back={{ href: "/shikaku/duel", label: "Duel" }} />
                <div className="flex flex-col items-center gap-2 text-center">
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Couldn't join this room</h1>
                    <p className="text-[15px] text-label-secondary">{sessionError}</p>
                </div>
                <PrimaryBtn text="Create a new game" handleEvent={() => navigate("/duel")} />
            </div>
        );
    }

    // connecting or waiting for opponent
    if (duelState === "connecting" || duelState === "waiting") {
        return (
            <div className={page}>
                <NavBar back={{ href: "/shikaku/duel", label: "Duel" }} title="Duel" />

                <div className="flex flex-col items-center gap-3">
                    {/* activity indicator */}
                    <span
                        aria-hidden
                        className="h-5 w-5 animate-spin rounded-full border-2 border-label-quaternary border-t-label-secondary"
                    />
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
                        {duelState === "connecting" ? "Connecting…" : "Waiting for opponent…"}
                    </h1>
                </div>

                {duelState === "waiting" && (
                    <div className="flex w-full max-w-md flex-col gap-2.5 rounded-2xl bg-surface p-4 shadow-card ring-1 ring-separator">
                        <p className="text-[13px] font-medium text-label-secondary">
                            Share this link
                        </p>
                        <div className="flex items-center gap-2">
                            <code className="min-w-0 flex-1 truncate rounded-xl bg-fill-quaternary px-3 py-2 font-mono text-[13px] text-label-secondary">
                                {window.location.href}
                            </code>

                            {/* Copied module */}
                            <button
                                type="button"
                                onClick={() => {
                                    const text: string = String(window.location.href);
                                    navigator.clipboard.writeText(text);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 7000);
                                }}
                                className={`btn btn-tinted shrink-0 ${copied ? "text-green" : ""}`}
                            >
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                    </div>
                )}

                <PrimaryBtn variant="plain" text="Cancel" handleEvent={() => navigate("/duel")} />
            </div>
        );
    }

    // game in progress or finished
    return (
        <div className={page}>
            <NavBar back={{ href: "/shikaku/duel", label: "Duel" }} title="Duel" />

            <div className="flex h-7 items-center justify-center">
                {disconnected && !gameOver && (
                    <p className="pill bg-red/12 text-red">Opponent disconnected</p>
                )}

                {!gameOver && !disconnected && (
                    <p className="text-[13px] text-label-tertiary">
                        Don't refresh — your progress will be lost.
                    </p>
                )}
            </div>

            {puzzle && (
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10">

                    {/* your board */}
                    <div className="flex flex-col items-center gap-3">
                        <p className={`pill ${gameOver && result === "you" ? "bg-green/12 text-green" : ""}`}>
                            You {gameOver && result === "you" ? "· Winner" : ""}
                        </p>
                        <div className={`transition-opacity duration-300 ${gameOver ? "opacity-70 pointer-events-none" : ""}`}>
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
                    <div className="flex flex-col items-center gap-3">
                        <p className={`pill ${gameOver && result === "opponent" ? "bg-green/12 text-green" : ""}`}>
                            Opponent {gameOver && result === "opponent" ? "· Winner" : ""}
                            {!gameOver && opponentProgress.total > 0
                                ? ` · ${opponentProgress.placed}/${opponentProgress.total}`
                                : ""}
                        </p>
                        <div className={`transition-opacity duration-300 ${gameOver ? "opacity-70" : ""}`}>
                            <OpponentBoard
                                rows={puzzle.rows}
                                cols={puzzle.cols}
                                clues={puzzle.clues}
                                tiles={opponentTiles}
                            />
                        </div>
                    </div>
                </div>
            )}

            {gameOver && (
                <div className="flex flex-col items-center gap-4 rounded-2xl bg-surface px-8 py-6 shadow-card ring-1 ring-separator animate-fade-up">
                    <p className="text-[22px] font-semibold tracking-[-0.02em]">
                        {result === "you" ? "You won!" : "Opponent won, lock in bruh."}
                    </p>
                    <div className="flex gap-2">
                        <PrimaryBtn text="New Game" handleEvent={() => navigate("/duel")} />
                        <a href="/shikaku/" className="btn btn-tinted">
                            Solo Mode
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}