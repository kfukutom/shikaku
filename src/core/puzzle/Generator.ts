import Board from "./Board";
import type { Tile } from "../tiles/Tile";
import type { Bounds, Clue } from "../../types";
import { fullShuffle } from "../../utils/randomizer";

// Tile Representations:
import { SquareTile } from "../tiles/SquareTile";
import { TallTile } from "../tiles/TallTile";
import { WideTile } from "../tiles/WideTile";

interface GeneratedPuzzle {
    readonly board: Board;
    readonly solution: Tile[];
    readonly clues: Clue[];
}

export default class GameGenerator {

    readonly rows: number;
    readonly cols: number;

    private readonly minArea: number;
    private readonly maxArea: number;

    constructor(rows: number, cols: number, minArea: number = 2, maxArea: number = 6) {
        this.rows = rows;
        this.cols = cols;
        this.minArea = minArea;
        this.maxArea = maxArea;
    }

    public generate(): GeneratedPuzzle {
        const board: Board = new Board(this.rows, this.cols);
        const solution: Tile[] = [];

        const maxAttempts: number = 20;
        for (let attempt = 0; attempt < maxAttempts; ++attempt) {
            board.reset();
            solution.length = 0;

            if (this.fill(board, solution, 0, 0)) {
                return {
                    board,
                    solution,
                    clues: this.buildClues(solution),
                }
            }

        }

        throw new Error("Failed to generate a valid parittion.");
    }


    // Placing the clue(s) across board:
    /**
     * Drops one area-clue on some random cell inside the tile's region.
     */
    private buildClues(solution: Tile[]): Clue[] {
        return solution.map(tile => {
            const cell_array = tile.getCells();
            const cell = cell_array[Math.floor(Math.random() * cell_array.length)];
            //console.log(cell);

            return {
                position: cell,
                area: tile.area,
                tileId: tile.id,
            };
        });
    }


    // Backtracking Method:
    /**
     * Recursively partitions the game board.
     * 1. Ask the board for the first empty cell.
     * 2. Enumerate every rectangle anchored there that fits.
     * 3. Shuffle candidates, try each by placing, recurse, then evict on failed attempts.
     * 
     * Note: Behavior is coupled with the Board Class.
     */
    private fill(board: Board, solution: Tile[], depth: number, nodes: number): boolean {
        const anchor = board.searchEmpty();
        if (!anchor) {
            // no empty cells -> board is fully partitioned.
            console.log("Fully partitioned board at this state.")
            return true;
        }

        const maxNodes = this.rows * this.cols * 200;
        if (nodes > maxNodes) {
            return false;
        }

        const candidates = this.getCandidates(board, anchor);
        fullShuffle(candidates);

        for (const bounds of candidates) {
            const tile = this.makeTile(depth, bounds);

            // board enforces placement rules internally:
            board.place(tile);
            solution.push(tile);

            if (this.fill(board, solution, depth+1, nodes+1)) {
                return true;
            }

            // dead end
            solution.pop();
            board.evict(tile.id);
        }

        return false;
    }

    // Candidate Enumeration:
    /**
     * Return valid rectangle anchored at the base whose area
     * falls within the minArea, maxArea and the region is empty on the board.
     */
    private getCandidates(board: Board, anchor: { row: number, col: number }) : Bounds[] {
        const out: Bounds[] = [];

        for (let w = 1; w <= this.cols - anchor.col; ++w) {
            for (let h = 1; h <= this.rows - anchor.row; ++h) {
                const area = w * h;
                //console.log(area);

                if (area < this.minArea) continue;
                if (area > this.maxArea) break;

                const bounds: Bounds = {
                    row: anchor.row,
                    col: anchor.col,
                    width: w,
                    height: h,
                };

                if (board.regionEmpty(bounds)) {
                    out.push(bounds);
                }
            }
        }

        console.log(out);  // for debugging
        return out;
    }

    // Tile factory:
    /**
     * Convert a bounding geometry / rectangle into the right tile subclass
     */
    private makeTile(index: number, bounds: Bounds) {
        const id: string = `tile-${index}`;

        if (bounds.height === bounds.width) {
            return SquareTile.create(
                id,
                bounds.row,
                bounds.col,
                bounds.width,
            );
        }

        if (bounds.height > bounds.width) {
            return TallTile.create(
                id,
                bounds.row,
                bounds.col,
                bounds.width,
                bounds.height,
            );
        }

        return WideTile.create(
            id,
            bounds.row,
            bounds.col,
            bounds.width,
            bounds.height,
        );
    }
}