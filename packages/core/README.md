# Core

All the game logic lives here: board, tiles, and puzzle generation.

```
src/tiles/
  Tile.ts             shape interface
  BaseTile.ts         shared logic (cells, overlap, bounds checking)
  SquareTile.ts       w == h
  TallTile.ts         h > w
  WideTile.ts         w > h

src/puzzle/
  Generator.ts        partitions grid via backtracking, places clues
  Board.ts            grid state, placement/eviction, neighbor lookups

src/utils/
  randomizer.ts        fisher-yates shuffling in place
```

The generator fills the board with random rectangles, each tile subclass validates its own shape, and the board tracks who owns what.