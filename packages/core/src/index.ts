// packages/core/src/index.ts
export type { Position, Bounds, Clue, Cell, ShapeType } from "./types.js";
export type { Tile } from "./tiles/Tile.js";
export { BaseTile } from "./tiles/BaseTile.js";
export { SquareTile } from "./tiles/SquareTile.js";
export { TallTile } from "./tiles/TallTile.js";
export { WideTile } from "./tiles/WideTile.js";
export { createTile } from "./tiles/TileFactory.js";
export type { BoardObserver } from "./puzzle/Board.js";
export { default as Board } from "./puzzle/Board.js";
export { default as GameGenerator } from "./puzzle/Generator.js";