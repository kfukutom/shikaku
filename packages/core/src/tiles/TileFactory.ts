import type { Tile } from "./Tile.js";
import type { Bounds } from "../types.js";
import { SquareTile } from "./SquareTile.js";
import { TallTile } from "./TallTile.js";
import { WideTile } from "./WideTile.js";

export function createTile(id: string, bounds: Bounds): Tile {
    if (bounds.width === bounds.height) {
        return SquareTile.create(
            id,
            bounds.row,
            bounds.col,
            bounds.width
        );
    }
    if (bounds.height > bounds.width) {
        return TallTile.create(
            id,
            bounds.row,
            bounds.col,
            bounds.width,
            bounds.height
        );
    }

    return WideTile.create(
        id,
        bounds.row,
        bounds.col,
        bounds.width,
        bounds.height
    );
}