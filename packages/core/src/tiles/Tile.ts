import type { 
    Bounds,
    Position,
    ShapeType 
} from "../types.js";

export interface Tile {
    readonly id: string;
    readonly bounds: Bounds;
    readonly shapeType: ShapeType;

    // the total number of area the tile occupies
    readonly area: number;
    
    // Helper methods:
    getCells(): Position[];
    getOverlap(other: Tile): boolean;
    containsCell(cell: Position): boolean;

    isValid(): boolean;
}