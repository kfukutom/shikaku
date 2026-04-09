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

export interface Cell {
    readonly id: number;
    occupant: string | null; // refer to Tile's base id.
    status: TileStatus;
}

// clue rendered on the board for the player
export interface Clue {
    readonly position: Position;
    readonly area: number;
    readonly tileId: string;
}

export interface HeaderProps {
    grid: string;
    level: string;
}