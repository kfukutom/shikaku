import type { Tile } from "../tiles/Tile";
import type { Cell, Position, Bounds } from "../../types";

export default class Board {

    readonly rows: number;
    readonly cols: number;
    private grid: Cell[][];
    private occupancy: Map<string, Position[]>;

    constructor(rows: number, cols: number) {
        this.rows = rows;
        this.cols = cols;
        this.grid = this.initGrid();
        this.occupancy = new Map();
    }


    // Grid Initialization:
    private initGrid(): Cell[][] {
        const grid: Cell[][] = [];
        let id = 0;

        for (let row = 0; row < this.rows; ++row) {
            const rowCells: Cell[] = [];
            for (let col = 0; col < this.cols; ++col) {
                rowCells.push({
                    id: id++,
                    occupant: null,
                    status: 'empty',
                });
                //console.log(rowCells);
            }
            grid.push(rowCells);
        }
        
        return grid;
    }

    // Cell Accesors:
    getCell(pos: Position): Cell | null {
        if (!this.inBounds(pos)) return null;
        return this.grid[pos.row][pos.col];
    }

    inBounds(pos: Position): boolean {
        return (
            pos.row >= 0 &&
            pos.row < this.rows &&
            pos.col >= 0 &&
            pos.col < this.cols
        );
    }

    getNeighbors(pos: Position): Cell[] {
        const deltas: Position[] = [
            { row: -1, col: 0 },
            { row: 1, col: 0 },
            { row: 0, col: -1 },
            { row: 0, col: 1 }
        ];

        const neighbors: Cell[] = [];
        for (const d of deltas) {
            const cell = this.getCell(
                { 
                    row: pos.row + d.row,
                    col: pos.col + d.col 
                }
            );
            if (cell !== null) {
                neighbors.push(cell);
            }
        }

        return neighbors;
    }

    // Scan / Querying:

    /**
     * Scans top left to bottom right and returns the first empty cell.
     * or null is returned if the board is full. Used by the generator to find the next
     * anchor point for tile placement.
     */
    searchEmpty(): Position | null {
        for (let row = 0; row < this.rows; ++row) {
            for (let col = 0; col < this.cols; ++col) {
                if (this.grid[row][col].status === "empty") {
                    return {
                        row,
                        col,
                    }
                }
            }
        }

        // otherwise return a null object
        return null;
    }

    // Cell Placement:
    /**
     * Returns true when every cell the tile covers is in bounds and / or empty.
     */
    canPlace(tile: Tile): boolean {
        if (!tile.isValid()) return false;

        return tile.getCells().every(pos => {
            const cell = this.getCell(pos);
            return cell !== null && cell.status === "empty";
        });
    }

    /**
     * Marks every cell the tile covers as an occupant, and records the
     * tile int he occupancy map. Return false when placement is not permitted.
     */
    place(tile: Tile): boolean {
        if (!this.canPlace(tile)) return false;

        const positions: Position[] = [];

        for (const pos of tile.getCells()) {
            const cell = this.grid[pos.row][pos.col];
            cell.occupant = tile.id;
            cell.status = "occupied";
            positions.push(pos);
        }

        this.occupancy.set(tile.id, positions);

        return true;
    }


    // Eviction of Tiles:
    /**
     * Removes a tile from the board, freeing its cell.
     * Returns the position that was cleared (empty array iff ID DNE).
     */
    evict(tileId: string): Position[] {
        const positions = this.occupancy.get(tileId);
        if (!positions) return [];

        for (const pos of positions) {
            const cell = this.grid[pos.row][pos.col];
            cell.occupant = null;
            cell.status = "empty";
        }

        this.occupancy.delete(tileId);

        return positions;
    }


    // Region Queries:
    /**
     * Returns trye when every cell insie the bounds is in-bounds + empty.
     * Is useful for the generator to test candidate shapes before committing to a tile.
     */
    regionEmpty(bounds: Bounds): boolean {
        for (let row = bounds.row; row < bounds.row + bounds.height; ++row) {
            for (let col = bounds.col; col < bounds.col + bounds.width; ++col) {
                const cell = this.getCell({ row, col });
                if (cell === null || cell.status !== "empty") {
                    return false;
                }
            }
        }
        return true;
    }


    // Board State:
    isFull(): boolean {
        return this.searchEmpty() === null;
    }

    reset(): void {
        this.grid = this.initGrid();
        this.occupancy.clear();
    }
}