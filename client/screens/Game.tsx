import { useState, useRef, useCallback } from "react";
import { Header, SolvedBanner, GameBoard } from "../components";
import { GameGenerator } from "@tiles/core";
import { DIFFICULTY, FALLBACK_DIFFICULTY, LEVEL_LABELS } from "../utils/constants";
import type { Tile, Clue } from "@tiles/core";

interface Puzzle {
    rows: number;
    cols: number;
    solution: Tile[];
    clues: Clue[];
    id: number;
}

function difficultyForScore(score: number) {
    return DIFFICULTY.find(d => score < d.until) ?? FALLBACK_DIFFICULTY;
}

export default function Game() {
    const puzzleId = useRef(0);
    const [score, setScore] = useState(0);
    const [solved, setSolved] = useState(false);

    const makePuzzle = useCallback((forScore: number): Puzzle => {
        const diff = difficultyForScore(forScore);
        const { solution, clues } = new GameGenerator(
            diff.rows, diff.cols, diff.minArea, diff.maxArea
        ).generate();

        //console.log(solution);

        return {
            rows: diff.rows,
            cols: diff.cols,
            solution,
            clues,
            id: ++puzzleId.current
        };
    },[]);

    const [puzzle, setPuzzle] = useState<Puzzle>(() => {
        const diff = difficultyForScore(0);
        const { solution, clues } = new GameGenerator(
            diff.rows, diff.cols, diff.minArea, diff.maxArea
        ).generate();

        return {
            rows: diff.rows,
            cols: diff.cols,
            solution, 
            clues,
            id: 0,
        };
    });

    function handleSolve() {
        setSolved(true);
        setScore(s => s + 1);
    }

    function handlePlayNext() {
        setPuzzle(makePuzzle(score));
        setSolved(false);
    }

    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-6 p-2">
            <Header
                grid={`${puzzle.rows} x ${puzzle.cols}`}
                level={LEVEL_LABELS[puzzle.rows] ?? "GMI"}
            />

            <GameBoard
                key={puzzle.id}
                rows={puzzle.rows}
                cols={puzzle.cols}
                solution={puzzle.solution}
                clues={puzzle.clues}
                onSolve={handleSolve}
            />

            {solved && <SolvedBanner onPlayNext={handlePlayNext} />}
        </div>
    );
}