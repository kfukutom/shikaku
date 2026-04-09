// packages/core/src/index.ts
export type { Position, Bounds, Clue, Cell, ShapeType } from "./types";
export type { Tile } from "./tiles/Tile";
export { BaseTile } from "./tiles/BaseTile";
export { SquareTile } from "./tiles/SquareTile";
export { TallTile } from "./tiles/TallTile";
export { WideTile } from "./tiles/WideTile";
export { createTile } from "./tiles/TileFactory";
export { default as Board } from "./puzzle/Board";
export { default as GameGenerator } from "./puzzle/Generator";