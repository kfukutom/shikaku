import { z } from "zod";

export const BoundsSchema = z.object({
    row: z.number().int().nonnegative(),
    col: z.number().int().nonnegative(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
});
 
// discriminated union so we get exhaustive checking for free
export const ClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("place"),
        bounds: BoundsSchema,
        tileId: z.string(),
    }),
    z.object({ 
        type: z.literal("evict"),
        tileId: z.string().min(1),
    }),
    z.object({
        type: z.literal("solved")
    }),
]);

/**
 * Body of POST /create. Generation is synchronous backtracking on the event
 * loop, so the dimensions are clamped hard — an unbounded grid would stall
 * the whole server. Defaults match what the duel screen asks for.
 */
export const CreateRoomSchema = z
    .object({
        rows: z.number().int().min(4).max(12).default(6),
        cols: z.number().int().min(4).max(12).default(6),
        minArea: z.number().int().min(1).max(16).default(2),
        maxArea: z.number().int().min(1).max(16).default(8),
    })
    .refine(v => v.minArea <= v.maxArea, {
        message: "minArea cannot exceed maxArea",
        path: ["minArea"],
    })
    .refine(v => v.maxArea <= v.rows * v.cols, {
        message: "maxArea cannot exceed the size of the board",
        path: ["maxArea"],
    });