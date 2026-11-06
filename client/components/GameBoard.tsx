import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createTile } from "@tiles/core";
import type { Tile, Bounds, Clue, BoardObserver } from "@tiles/core";

import { useBoard } from "../hooks/useBoard";
import { useDrag } from "../hooks/useDrag";
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
    onPlace?: (tileId: string, bounds: Bounds) => void;
    onEvict?: (tileId: string) => void;
    disabled?: boolean;
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
export default function GameBoard({ rows, cols, solution, clues, onSolve, onPlace, onEvict, disabled = false }: GameBoardProps) {
    const { place, evict, reset, addObserver } = useBoard(rows, cols);
    const drag = useDrag();

    const [placed, setPlaced] = useState<PlacedTile[]>([]);
    const [solved, setSolved] = useState(false);
    const [colorIndex, setColorIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [skipping, setSkipping] = useState(false);
    const [selectedTile, setSelectedTile] = useState<string | null>(null);

    const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const skipTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

    // clean up any pending skip animations on unmount
    useEffect(() => () => skipTimeouts.current.forEach(clearTimeout), []);

    // bridge board events to multiplayer callbacks so every place/evict
    // (including the ones in skip) relays automatically
    const observer = useMemo<BoardObserver>(() => ({
        onTilePlaced(tile) {
            onPlace?.(tile.id, tile.bounds);
        },
        onTileEvicted(tileId) {
            onEvict?.(tileId);
        },
    }), [onPlace, onEvict]);

    useEffect(() => {
        const unsubscribe = addObserver(observer);
        return unsubscribe;
    }, [addObserver, observer]);

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

        // board handles the overlap check internally; observer relays onPlace
        const tile = place(bounds);
        if (!tile) return showError("Overlaps an existing tile");

        const color = TILE_COLORS[colorIndex % TILE_COLORS.length];
        const updated = [...placed, { tile, color, clueId: contained[0].tileId }];

        setPlaced(updated);
        setColorIndex(i => i + 1);

        if (updated.length === clues.length) {
            setSolved(true);
            onSolve();
        }
    }

    function removeTile(id: string) {
        // observer relays onEvict when the board emits
        evict(id);
        setPlaced(prev => prev.filter(p => p.tile.id !== id));
    }

    function handleUndo(): void {
        const last = placed.at(-1);
        if (last) removeTile(last.tile.id);
        drag.cancel();
        setError(null);
    }

    function handleMouseDown(r: number, c: number): void {
        if (skipping || solved || disabled) return;

        const owner = findOwner(r, c);
        if (owner) {
            if (selectedTile === owner.tile.id) {
                // the selected tile matches the owner's referenced id.
                removeTile(owner.tile.id);
                setSelectedTile(null);
            } else {
                setSelectedTile(owner.tile.id);
            }
            return;
        }

        setSelectedTile(null);
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

        // clear the board first (observer relays each evict to opponent)
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

    // Cells, tile overlay, and clue overlay all share this template so they line up.
    const gridTemplate = {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
    };

    const gridArea = (b: Bounds) => ({
        gridColumn: `${b.col + 1} / span ${b.width}`,
        gridRow: `${b.row + 1} / span ${b.height}`,
    });

    return (
        <div className="flex flex-col items-center gap-4">

            {/* error or area indicator */}
            <div className="h-6 flex items-center justify-center">
                <p className={`
                    text-[13px] font-medium tabular-nums transition-opacity duration-300
                    ${error ? "opacity-100 text-red"
                        : drag.anchor ? "opacity-100 text-label-secondary"
                        : "opacity-0"}
                `}>
                    {error ?? (drag.anchor && drag.area > 0 ? `Area ${drag.area}` : "\u00A0")}
                </p>
            </div>

            {/* board */}
            <div className="relative select-none overflow-hidden rounded-2xl border border-separator bg-separator shadow-card">

                {/* grid */}
                <div
                    className="grid gap-px"
                    style={gridTemplate}
                    onMouseLeave={() => { if (drag.isActive.current) drag.cancel(); }}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={(e) => {
                        e.preventDefault();
                        handleMouseUp();
                    }}
                >
                    {Array.from({ length: rows }, (_, r) =>
                        Array.from({ length: cols }, (_, c) => (
                            <div
                                key={`${r}-${c}`}
                                data-cell={`${r},${c}`}
                                className="board-cell w-14 h-14 cursor-pointer"
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
                                        const key = element.getAttribute('data-cell') ?? element.closest('[data-cell]')?.getAttribute('data-cell');
                                        if (key) {
                                            const [ row, col ] = key.split(',').map(Number);
                                            drag.move({
                                                row,
                                                col,
                                            });
                                        }
                                    }
                                }}
                            />
                        ))
                    )}
                </div>

                {/* placed tiles + drag preview */}
                <div
                    className="pointer-events-none absolute inset-0 grid gap-px"
                    style={gridTemplate}
                    aria-hidden
                >
                    {drag.preview && (
                        <div
                            className="m-0.5 rounded-lg bg-fill ring-1 ring-inset ring-label/10"
                            style={gridArea(drag.preview)}
                        />
                    )}
                    {placed.map(p => {
                        const isSelected = selectedTile === p.tile.id;
                        return (
                            <div
                                key={p.tile.id}
                                className={`
                                    m-0.5 rounded-lg animate-tile-in
                                    transition-[box-shadow,opacity] duration-200
                                    ${isSelected ? "ring-2 ring-inset ring-label" : ""}
                                `}
                                style={{ ...gridArea(p.tile.bounds), backgroundColor: p.color }}
                            />
                        );
                    })}
                </div>

                {/* clue numbers */}
                <div
                    className="pointer-events-none absolute inset-0 grid gap-px"
                    style={gridTemplate}
                    aria-hidden
                >
                    {clues.map(clue => {
                        const cluePlaced = placed.some(p => p.clueId === clue.tileId);
                        return (
                            <span
                                key={clue.tileId}
                                className={`
                                    flex items-center justify-center
                                    text-[17px] font-semibold tabular-nums
                                    transition-colors duration-200
                                    ${cluePlaced ? "text-label-secondary" : "text-label"}
                                `}
                                style={{
                                    gridColumn: clue.position.col + 1,
                                    gridRow: clue.position.row + 1,
                                }}
                            >
                                {clue.area}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* controls */}
            {!disabled && (
                <div className="h-9 flex items-center justify-center gap-2">
                    {placed.length > 0 && !skipping && !solved && (
                        <button type="button" onClick={handleUndo} className="btn btn-tinted">
                            Undo
                        </button>
                    )}
                    {!skipping && placed.length < solution.length && (
                        <button type="button" onClick={handleSkip} className="btn btn-tinted">
                            Skip
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}