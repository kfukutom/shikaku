import { BaseTile } from "./BaseTile.js";
import type { ShapeType } from "../types.js";

export class WideTile extends BaseTile {

    get shapeType(): ShapeType {
        return 'wide';
    }

    isValid(): boolean {
        return this.bounds.width > this.bounds.height;
    }

    static create(id: string, row: number, col: number, width: number, height: number): WideTile {
        return new WideTile(
            id,
            {
                row,
                col,
                width,
                height
            }
        );
    }

    static validSizes(area: number): [width: number, height: number][] {
        const sizes: [number, number][] = [];

        for (let h = 1; h < area; ++h) {
            if (area % h === 0) {
                const w = area / h;
                if (w > h) {
                    sizes.push([w, h]);
                }
            }
        }
        
        return sizes;
    }
}