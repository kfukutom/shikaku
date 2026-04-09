Drawn inspiration from [Shikaku](https://en.wikipedia.org/wiki/Shikaku), as well as EECS 498 at the University of Michigan. Contains the board representation, tile shapes, and puzzle generation logic.

## Design Choice / Architecture

Monorepo with three packages:

- **`packages/core`** - Board representation, tile shapes, puzzle generation via backtracking. Shared by both client and the server. Using deep abstractions and subtype polymorphism for individual tile representations.
- **`client`** - React, TailwindCSS UI. Drag to draw rectangles, undo, skip, and auto-scaling difficulty.
- **`server`** - Express, WebSocket server for a *proposed* real-time duel mode. Handles session creation, move validation, and opponent broadcasting.