import type { Tile } from "./Tile";
import type { Bounds } from "../types";
import { SquareTile } from "./SquareTile";
import { TallTile } from "./TallTile";
import { WideTile } from "./WideTile";

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