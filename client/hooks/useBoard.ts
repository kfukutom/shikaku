import { useRef, useCallback, useEffect } from "react";
import { Board, createTile } from "@tiles/core";
import type { Tile, Bounds } from "@tiles/core";
import type { BoardObserver } from "@tiles/core";

/**
 * This serves as a thin wrapper around the Board so components don't douch the ref directly.
 * @returns place/evict/reset - everything needed in the game loop.
 * 
 * place() creates a tile from bounds and attempts to put them on the board.
 * Return the tile on any success, null if the spot is already occupied.
 */
export function useBoard(rows: number, cols: number) {
    const board = useRef(new Board(rows, cols));
    const counter = useRef(0);

    const place = useCallback((bounds: Bounds) : Tile | null => {
        const id = `placed-${++counter.current}`;
        const tile = createTile(id, bounds);

        if (!board.current.canPlace(tile)) {
            return null;
        }

        board.current.place(tile);
        return tile;
    }, []);

    const evict = useCallback((tileId: string) => {
        board.current.evict(tileId);
    }, []);

    const reset = useCallback(() => {
        board.current.reset();
    }, []);

    const addObserver = useCallback((observer: BoardObserver): () => void => {
        return board.current.addObserver(observer);
    }, []);

    return {
        place,
        evict,
        reset,
        addObserver,
    };
}

/**
 * Convenience hooks for subscribing to board events inside components.
 * Automatically handles cleanup on unmount or when observers would change.
 */
export function useBoardObserver(
    addObserver: (observer: BoardObserver) => () => void,
    observer: BoardObserver,
) {
    useEffect(() => {
        const unsubscribe = addObserver(observer);
        return unsubscribe;
    }, [addObserver, observer]);
}
