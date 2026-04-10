import { GameGenerator } from "@tiles/core";
import type { Bounds, Clue } from "@tiles/core";

interface ServerPuzzle {
    rows: number;
    cols: number;
    clues: Clue[];
    solution: Bounds[];
    tileCount: number;
};

// generates a puzzle and splits it into what the client sees (clues)
// and what stays server-side (solution bounds);
export function generatePuzzle(rows: number, cols: number, minArea: number, maxArea: number) : ServerPuzzle {
    const gen: GameGenerator = new GameGenerator(rows,cols,minArea,maxArea);
    const { solution, clues } = gen.generate();

    //console.log(solution);

    return {
        rows,
        cols,
        clues,
        solution: solution.map(t => t.bounds),
        tileCount: solution.length,
    };
}