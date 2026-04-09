import { useState, useMemo, useRef, useCallback } from "react";
import type { Position, Bounds } from "@tiles/core";

// two corners -> bounding rectangle
function toBounds(a: Position, b: Position): Bounds {
    return {
        row: Math.min(a.row, b.row),
        col: Math.min(a.col, b.col),
        width: Math.abs(a.col - b.col) + 1,
        height: Math.abs(a.row - b.row) + 1,
    };
}

/**
 * Handles the click-and-drag rectangle selection.
 *
 * start() on mousedown, move() on mouseenter, end() on mouseup.
 * end() returns the final bounds if valid, null otherwise.
 * cancel() bails out (e.g. mouse leaves the grid).
 */
export function useDrag() {
    const [anchor, setAnchor] = useState<Position | null>(null);
    const [hover, setHover] = useState<Position | null>(null);
    const active = useRef(false);

    const preview = useMemo<Bounds | null>(() => {
        return anchor && hover ? toBounds(anchor, hover) : null;
    }, [anchor, hover]);

    const area = preview ? preview.width * preview.height : 0;

    const start = useCallback((pos: Position) => {
        active.current = true;
        setAnchor(pos);
        setHover(pos);
    }, []);

    const move = useCallback((pos: Position) => {
        if (active.current) setHover(pos);
    }, []);

    // finalize the drag — returns bounds or null if nothing was dragged
    const end = useCallback((): Bounds | null => {
        if (!active.current || !anchor || !hover) {
            active.current = false;
            setAnchor(null);
            setHover(null);
            return null;
        }

        const bounds = toBounds(anchor, hover);
        active.current = false;
        setAnchor(null);
        setHover(null);
        return bounds;
    }, [anchor, hover]);

    const cancel = useCallback(() => {
        active.current = false;
        setAnchor(null);
        setHover(null);
    }, []);

    return {anchor, preview, area, isActive: active, start, move, end, cancel};
}