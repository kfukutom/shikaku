Drawn inspiration from [Shikaku](https://en.wikipedia.org/wiki/Shikaku), as well as EECS 498 at the University of Michigan. Contains the board representation, tile shapes, and puzzle generation logic.

### Design Choice / Architecture

This is a monorepo with mainly three packages:

- **`packages/core`** - Board representation, tile shapes, puzzle generation via backtracking. Shared by both client and the server. Using deep abstractions and subtype polymorphism for individual tile representations.
- **`client`** - React, TailwindCSS UI. Drag to draw rectangles, undo, skip, and auto-scaling difficulty.
- **`server`** - Express, WebSocket server for a *proposed* real-time duel mode. Handles session creation, move validation, and opponent broadcasting.

### Getting Started
```bash
pnpm install

# solo play
pnpm run dev:client

# duel server
pnpm run dev:server
```

Primary objective of this project is to understand software design patterns that appear in larger codebases, and to explore certain tradeoffs in writing TypeScript. TypeScript was chosen out of respect to what's commonly used in fullstack, as well as from [EECS 498](https://eecs498-software-design.org/). Thanks.