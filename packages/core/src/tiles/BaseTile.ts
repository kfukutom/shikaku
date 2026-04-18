import type { Tile } from "./Tile.js";
import type { 
    Position,
    ShapeType,
    Bounds 
} from "../types.js";

export abstract class BaseTile implements Tile {

    readonly id: string;
    readonly bounds: Bounds;
    readonly area: number;

    constructor(id: string, bounds: Bounds) {
        this.id = id;
        this.bounds = bounds;

        // calculate area based on bounds interface
        this.area = this.bounds.width * this.bounds.height;
    }

    // abstract methods for subclasses to implement
    abstract get shapeType(): ShapeType;
    abstract isValid(): boolean;

    getCells() : Position[] {
        const cells: Position[] = [];

        for (let row = 0; row < this.bounds.height; ++row) {
            for (let col = 0; col < this.bounds.width; ++col) {
                cells.push({
                    row: this.bounds.row + row,
                    col: this.bounds.col + col
                });
            }
        }
        return cells;
    }

    containsCell(pos: Position): boolean {
        return (
            pos.row >= this.bounds.row &&
            pos.row < this.bounds.row + this.bounds.height &&
            pos.col >= this.bounds.col &&
            pos.col < this.bounds.col + this.bounds.width
        );
    }

    getOverlap(other: Tile): boolean {
        // shallow copy of bounds for easier access
        const a = this.bounds;
        const b = other.bounds;

        // check if the two tiles overlap via axis-aligned bounding box
        return (
            a.col < b.col + b.width &&
            a.col + a.width > b.col &&
            a.row < b.row + b.height &&
            a.row + a.height > b.row
        )
    }

    // added a static helper for asserting shape types whcih can be used by subclasses to ensure they only use valid shape types
    static assertShape(shape: ShapeType) {
        switch (shape) {
            case 'square': {
                return true;
            }
            case 'tall': {
                return true;
            }
            case 'wide': {
                return true;
            }
            default: {
                // never type to ensure all cases are handled
                const exhaust: never = shape;
                throw new Error(`Invalid shape type: ${exhaust}`);
            }
        }
    }
}