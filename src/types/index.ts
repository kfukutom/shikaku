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