import { BaseTile } from './BaseTile.js';
import type { ShapeType } from '../types.js';

export class TallTile extends BaseTile {

    get shapeType(): ShapeType {
        return 'tall';
    }

    isValid(): boolean {
        return this.bounds.height > this.bounds.width;
    }

    static create(id: string, row: number, col: number, width: number, height: number) : TallTile {
        return new TallTile(
            id,
            {
                row,
                col,
                width,
                height,
            }
        );
    }

    static validSizes(area: number): [width: number, height: number][] {
        const sizes : [number, number][] = [];

        for (let w = 1; w < area; ++w) {
            if (area % w === 0) {
                const h = area / w;
                if (h > w) {
                    sizes.push([w,h]);
                }
            }
        }

        return sizes;
    }
}