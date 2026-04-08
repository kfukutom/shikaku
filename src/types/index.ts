export type ShapeType = 'square' | 'tall' | 'wide';

export interface Position {
    readonly row: number;
    readonly col: number;
}

export interface Bounds {
    readonly row: number;
    readonly col: number;
    readonly width: number;
    readonly height: number;
}

// representation of a tile on the board
type TileStatus = 'occupied' | 'in-action' | 'empty';

export interface Tile {
    readonly id: number;
    occupant: string | null; // refer to Tile's base id.
    status: TileStatus;
}