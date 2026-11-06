import { useMemo } from "react";
import type { Bounds, Clue } from "@tiles/core";
import { useClueMap } from "../hooks/useClueMap";

interface OpponentTile {
    tileId: string;
    bounds: Bounds;
    color: string;
}

interface OpponentBoardProps {
    rows: number;
    cols: number;
    clues: Clue[];
    tiles: OpponentTile[];
}

function posInBounds(r: number, c: number, b: Bounds): boolean {
    return r >= b.row && r < b.row + b.height
        && c >= b.col && c < b.col + b.width;
}

export default function OpponentBoard({ rows, cols, clues, tiles }: OpponentBoardProps) {
    const clueMap = useClueMap(clues);

    const coveredClues = useMemo(() => {
        const set = new Set<string>();
        for (const t of tiles) {
            for (const cl of clues) {
                if (posInBounds(cl.position.row, cl.position.col, t.bounds)) {
                    set.add(cl.tileId);
                }
            }
        }
        return set;
    }, [tiles, clues]);

    const total = clues.length;
    const placed = tiles.length;
    const progressPct = total > 0 ? Math.round((placed / total) * 100) : 0;

    // Both grids share this template so tile overlays line up with cells.
    const gridTemplate = {
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
    };

    return (
        <section
            aria-label="Opponent board"
            className="inline-flex select-none flex-col gap-2.5"
        >
            {/* Board frame */}
            <div className="relative overflow-hidden rounded-2xl border border-separator bg-separator shadow-card">
                <div className="grid gap-px" style={gridTemplate}>
                    {Array.from({ length: rows }, (_, r) =>
                        Array.from({ length: cols }, (_, c) => {
                            const clue = clueMap.get(`${r},${c}`) ?? null;
                            const covered = clue ? coveredClues.has(clue.tileId) : false;

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className="flex h-9 w-9 items-center justify-center bg-surface sm:h-11 sm:w-11"
                                >
                                    {clue && (
                                        <span
                                            className={`
                                                h-1.5 w-1.5 rounded-full transition-colors duration-200
                                                ${covered ? "bg-label-quaternary" : "bg-label-tertiary"}
                                            `}
                                        />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Opponent tiles use a theme-aware fill rather than the server's fixed color */}
                <div
                    className="pointer-events-none absolute inset-0 grid gap-px"
                    style={gridTemplate}
                    aria-hidden
                >
                    {tiles.map((t) => (
                        <div
                            key={t.tileId}
                            className="m-0.5 rounded-md bg-label/15 animate-tile-in"
                            style={{
                                gridColumn: `${t.bounds.col + 1} / span ${t.bounds.width}`,
                                gridRow: `${t.bounds.row + 1} / span ${t.bounds.height}`,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Progress rail */}
            <div className="h-1 w-full overflow-hidden rounded-full bg-fill-tertiary">
                <div
                    className="h-full rounded-full bg-label transition-[width] duration-500 ease-out"
                    style={{width: `${progressPct}%`}}
                />
            </div>
        </section>
    );
}
