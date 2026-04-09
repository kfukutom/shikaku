import { BaseTile } from "./BaseTile";
import type { ShapeType } from "../types";

export class SquareTile extends BaseTile {

    get shapeType() : ShapeType {
        return 'square';
    }

    isValid(): boolean {
        return this.bounds.width === this.bounds.height;
    }

    static create(id: string, row: number, col: number, size: number): SquareTile {
        return new SquareTile(
            id,
            { 
                row,
                col,
                width: size,
                height: size
            }
        )
    }

    static validSizes(area: number): number[] {
        const side = Math.sqrt(area);
        if (Number.isInteger(side)) {
            return [side];
        }
        
        return [];
    }
}