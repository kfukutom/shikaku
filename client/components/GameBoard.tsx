import { useState, useCallback, useRef, useEffect } from "react";
import { createTile } from "@tiles/core";
import type { Tile, Bounds, Clue } from "@tiles/core";

import { useBoard } from "../hooks/useBoard";
import { useDrag } from "../hooks/useDrag";
import { useClueMap } from "../hooks/useClueMap";
import { TILE_COLORS } from "../utils/constants";

interface PlacedTile {
    tile: Tile;
    color: string;
    clueId: string;
}

interface GameBoardProps {
    rows: number;
    cols: number;
    solution: Tile[];
    clues: Clue[];
    onSolve: () => void;
    onPlace?: (bounds: Bounds) => void;
    onEvict?: (tileId: string) => void;
}

function posInBounds(r: number, c: number, b: Bounds): boolean {
    return r >= b.row && r < b.row + b.height && c >= b.col && c < b.col + b.width;
}

/**
 * Interactive puzzle board.
 *
 * Click and drag to draw a rectangle. If it contains exactly one
 * clue and the area matches, the tile gets placed. Click an existing
 * tile to remove it. Undo pops the last tile, skip reveals the answer.
 */
export default function GameBoard({ rows, cols, solution, clues, onSolve, onPlace, onEvict }: GameBoardProps) {
    const { place, evict, reset } = useBoard(rows, cols);
    const drag = useDrag();
    const clueMap = useClueMap(clues);

    const [placed, setPlaced] = useState<PlacedTile[]>([]);
    const [solved, setSolved] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [skipping, setSkipping] = useState(false);

    const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    // clean up any pending skip animations on unmount
    useEffect(() => () => skipTimeouts.current.forEach(clearTimeout), []);

    // figure out which placed tile owns a given cell (if any)
    const findOwner = useCallback((r: number, c: number): PlacedTile | null => {
        return placed.find(p => p.tile.containsCell({ row: r, col: c })) ?? null;
    }, [placed]);

    function showError(msg: string) {
        if (errorTimeout.current) clearTimeout(errorTimeout.current);
        setError(msg);
        errorTimeout.current = setTimeout(() => setError(null), 3200);
    }

    /**
     * Validates a drawn rectangle against the puzzle rules:
     * - must contain exactly one unplaced clue
     * - area must match the clue's number
     * - can't overlap existing tiles
     */
    function tryPlace(bounds: Bounds) {
        const area = bounds.width * bounds.height;

        // find clues inside this rectangle that haven't been covered yet
        const contained = clues.filter(cl =>
            posInBounds(cl.position.row, cl.position.col, bounds)
            && !placed.some(p => p.clueId === cl.tileId)
        );

        if (contained.length !== 1)
            return showError("Rectangle must contain exactly one clue");

        if (contained[0].area !== area)
            return showError(`Area must be ${contained[0].area}, got ${area}`);

        // board handles the overlap check internally
        const tile = place(bounds);
        if (!tile) return showError("Overlaps an existing tile");

        const color = TILE_COLORS[colorIndex % TILE_COLORS.length];
        const updated = [...placed, { tile, color, clueId: contained[0].tileId }];

        setPlaced(updated);
        setColorIndex(i => i + 1);
        onPlace?.(bounds);

        if (updated.length === clues.length) {
            setSolved(true);
            onSolve();
        }
    }

    function removeTile(id: string) {
        evict(id);
        setPlaced(prev => prev.filter(p => p.tile.id !== id));
        onEvict?.(id);
    }

    function handleUndo() {
        const last = placed.at(-1);
        if (last) removeTile(last.tile.id);
        drag.cancel();
        setError(null);
    }

    function handleMouseDown(r: number, c: number) {
        if (skipping || solved) return;

        const owner = findOwner(r, c);
        if (owner) return removeTile(owner.tile.id);

        drag.start({ row: r, col: c });
        setError(null);
    }

    function handleMouseUp() {
        const bounds = drag.end();
        if (bounds) tryPlace(bounds);
    }

    function handleSkip() {
        if (skipping) return;
        setSkipping(true);
        drag.cancel();
        setError(null);

        // clear the board first
        placed.forEach(p => evict(p.tile.id));
        setPlaced([]);
        reset();

        // animate solution tiles in one at a time
        solution.forEach((solTile, i) => {
            const timeout = setTimeout(() => {
                const tile = createTile(solTile.id, solTile.bounds);
                place(solTile.bounds);

                const color = TILE_COLORS[i % TILE_COLORS.length];
                setPlaced(prev => [...prev, { tile, color, clueId: solTile.id }]);

                if (i === solution.length - 1) {
                    setSkipping(false);
                    setSolved(true);
                    onSolve();
                }
            }, (i + 1) * 300);

            skipTimeouts.current.push(timeout);
        });
    }

    return (
        <div className="flex flex-col items-center gap-4">

            {/* error or area indicator */}
            <div className="h-6 flex items-center justify-center">
                <p className={`
                    text-sm font-medium tracking-wide transition-opacity duration-300
                    ${error ? "opacity-100 text-red-400"
                        : drag.anchor ? "opacity-100 text-stone-500"
                        : "opacity-0"}
                `}>
                    {error ?? (drag.anchor && drag.area > 0 ? `Area: ${drag.area}` : "\u00A0")}
                </p>
            </div>

            {/* grid */}
            <div
                className="inline-grid border border-stone-700 select-none"
                style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
                onMouseLeave={() => { if (drag.isActive.current) drag.cancel(); }}
                onMouseUp={handleMouseUp}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    handleMouseUp();
                }}
            >
                {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: cols }, (_, c) => {
                        const owner = findOwner(r, c);
                        const clue = clueMap.get(`${r},${c}`) ?? null; 
                        //console.log(clue);
                        const inPreview = drag.preview ? posInBounds(r, c, drag.preview) : false;
                        const cluePlaced = clue ? placed.some(p => p.clueId === clue.tileId) : false;

                        // pick background: placed tile color > drag preview > nothing
                        const bg = owner
                            ? owner.color
                            : inPreview
                                ? "rgba(168, 162, 150, 0.25)"
                                : "transparent";

                        return (
                            <div
                                key={`${r}-${c}`}
                                data-cell={`${r},${c}`}
                                className="w-14 h-14 border border-stone-700 flex items-center justify-center
                                           cursor-pointer transition-all duration-300 ease-out"
                                style={{ backgroundColor: bg }}
                                onMouseDown={e => { e.preventDefault(); handleMouseDown(r, c); }}
                                onMouseEnter={() => drag.move({ row: r, col: c })}
                                onTouchStart={(e)=> {
                                    e.preventDefault();
                                    handleMouseDown(r, c);
                                }}
                                onTouchMove={(e) => {
                                    e.preventDefault();
                                    const touch = e.touches[0];

                                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                                    if (element) {
                                        //console.log(element);
                                        const key = element.getAttribute('data-cell') ?? element.closest('[data-cell')?.getAttribute('data-cell');
                                        if (key) {
                                            const [ row, col ] = key.split(',').map(Number);
                                            drag.move({
                                                row,
                                                col,
                                            });
                                        }
                                    }
                                }}
                            >
                                {clue && (
                                    <span className={`
                                        text-lg font-bold pointer-events-none
                                        transition-colors duration-200
                                        ${cluePlaced ? "text-stone-500" : "text-stone-200"}
                                    `}>
                                        {clue.area}
                                    </span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* controls */}
            <div className="h-6 flex items-center justify-center gap-4">
                {placed.length > 0 && !skipping && !solved && (
                    <button
                        onClick={handleUndo}
                        className="text-xs tracking-widest uppercase text-stone-500
                                   hover:text-stone-300 transition-colors duration-200
                                   cursor-pointer px-3 py-1"
                    >
                        Undo
                    </button>
                )}
                {!skipping && placed.length < solution.length && (
                    <button
                        onClick={handleSkip}
                        className="text-xs tracking-widest uppercase text-stone-500
                                   hover:text-stone-300 transition-colors duration-200
                                   cursor-pointer px-3 py-1"
                    >
                        Skip
                    </button>
                )}
            </div>
        </div>
    );
}
