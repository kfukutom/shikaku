import { Tile } from "../../types";

export default class Board {

    readonly rows: number;
    readonly cols: number;
    private board: Tile[][];

    constructor(in_row: number, in_col: number) {
        this.rows = in_row;
        this.cols = in_col;

        initBoard();
    }

    private initBoard() : Promise<void> {

    }
}