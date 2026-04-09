import { useMemo } from "react";
import type { Clue } from "@tiles/core";

/**
 * Pre indexes clues by "row, col" so cell lookups are constant time.
 * Without this, we'd be scanning the full array for every cell on every render.
 */
export function useClueMap(clues: Clue[]) {
    return useMemo(() => {
        const map = new Map<string, Clue>();
        for (const child of clues) {
            map.set(`${child.position.row},${child.position.col}`, child);
        }

        return map;
    }, [clues]);
}