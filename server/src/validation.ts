import type { Bounds, Clue } from "@tiles/core";
import { logMessage } from "./helper/helper";

type ValidationResult =
    | { valid: true; clue: Clue }
    | { valid: false; error: string };

/**
 * Server-side check for whether a rectangle placement is legal.
 * This exists because we can't trust the client(s)... even though
 * GameBoard does its own ux validation, the server needs
 * to independently verify every move
 */
export function validatePlacement(
    rows: number,
    cols: number,
    clues: Clue[],
    bounds: Bounds,
) : ValidationResult {

    if (bounds.width <= 0 || bounds.height <= 0) {
        logMessage('[Server]: Puzzle contains invalid dimensions', 'error');
        return { valid: false, error: "Invalid dimensions" };
    }

    if (!Number.isInteger(bounds.row) || !Number.isInteger(bounds.col) || 
        !Number.isInteger(bounds.width) || !Number.isInteger(bounds.height)) {
        logMessage('[Server]: Puzzle bounds must be integers', 'error');
        return { 
            valid: false,
            error: "Bounds must be integers"
        };
    }

    // Q: fits inside the grid?
    if (bounds.row < 0 || bounds.col < 0 ||
        bounds.row + bounds.height > rows ||
        bounds.col + bounds.width > cols) {
        return {
            valid: false,
            error: "Out of bounds",
        };
    }

    const area = bounds.width * bounds.height;

    // find which clues fall inside this rectangle
    const hits: Clue[] = [];
    for (const cl of clues) {
        const r = cl.position.row;
        const c = cl.position.col;

        if (r >= bounds.row && r < bounds.row + bounds.height &&
            c >= bounds.col && c < bounds.col + bounds.width) {
            hits.push(cl);
        }

        // early exit — more than one means it's already invalid
        if (hits.length > 1) {
            return { 
                valid: false,
                error: "Rectangle covers multiple clues",
            };
        }
    }

    if (hits.length === 0) {
        return { 
            valid: false,
            error: "No clue inside this rectangle",
        };
    }

    // at this point hits.length is exactly 1
    const matched = hits[0];

    if (matched.area !== area) {
        return {
            valid: false,
            error: `Clue says ${matched.area}, rectangle is ${area}`,
        };
    }

    return {
        valid: true,
        clue: matched,
    };
}