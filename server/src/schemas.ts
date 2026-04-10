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
    }),
    z.object({ 
        type: z.literal("evict"),
        tileId: z.string().min(1),
    }),
    z.object({
        type: z.literal("solved")
    }),
]);