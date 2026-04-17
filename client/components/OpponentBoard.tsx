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
            className="inline-block select-none rounded-md bg-stone-900/70 p-3 ring-1 ring-stone-700/50 shadow-2xs"
        >
            {/* Header: label + placement counter */}
            <div className="flex items-center justify-between gap-4 pb-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-stone-400">
                    Opponent
                </span>
                <span className="font-mono text-[11px] tabular-nums text-stone-400">
                    {String(placed).padStart(2, "0")}
                    <span className="mx-1 text-stone-700">/</span>
                    {String(total).padStart(2, "0")}
                </span>
            </div>

            {/* Board frame */}
            <div className="relative">
                {/* Corner brackets — classic HUD chrome */}
                <span className="absolute -top-0.5 -left-0.5  w-2.5 h-2.5 border-t border-l border-stone-500" />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 border-t border-r border-stone-500" />
                <span className="absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 border-b border-l border-stone-500" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-b border-r border-stone-500" />

                {/* Cell grid — inert surface with clue numbers + subtle dot texture */}
                <div
                    className="inline-grid rounded-sm bg-stone-950/60"
                    style={{
                        ...gridTemplate,
                        backgroundImage:
                            "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
                        backgroundSize: "10px 10px",
                    }}
                >
                    {Array.from({ length: rows }, (_, r) =>
                        Array.from({ length: cols }, (_, c) => {
                            const clue = clueMap.get(`${r},${c}`) ?? null;
                            const covered = clue ? coveredClues.has(clue.tileId) : false;

                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className="w-9 h-9 sm:w-11 sm:h-11 border border-stone-800/80
                                               flex items-center justify-center"
                                >
                                    {clue && (
                                        <span
                                            className={`
                                                font-mono text-sm sm:text-base font-semibold tabular-nums
                                                pointer-events-none
                                                transition-all duration-300 ease-out
                                                ${covered
                                                    ? "text-stone-600 scale-90"
                                                    : "text-stone-200 scale-100"}
                                            `}
                                        >
                                            {clue.area}
                                        </span>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Tile overlay — one grid-positioned rect per placement. */}
                <div
                    className="pointer-events-none absolute inset-0 grid"
                    style={gridTemplate}
                    aria-hidden
                >
                    {tiles.map((t) => (
                        <div
                            key={t.tileId}
                            className="opp-tile rounded-xs border border-white/10
                                       shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
                            style={{
                                gridColumn: `${t.bounds.col + 1} / span ${t.bounds.width}`,
                                gridRow: `${t.bounds.row + 1} / span ${t.bounds.height}`,
                                backgroundColor: t.color,
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Progress rail */}
            <div className="mt-2.5 h-0.75 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                    className="h-full bg-stone-400/90 transition-[width] duration-500 ease-out"
                    style={{width: `${progressPct}%`}}
                />
            </div>
        </section>
    );
}