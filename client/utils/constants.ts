// Constants file for the App

export const DIFFICULTY = [
    { until: 2, rows: 4, cols: 4, minArea: 2, maxArea: 4 },
    { until: 4, rows: 5, cols: 5, minArea: 2, maxArea: 6 },
    { until: 7, rows: 6, cols: 6, minArea: 2, maxArea: 8 },
    { until: 10, rows: 7, cols: 7, minArea: 2, maxArea: 10 },
    { until: 13, rows: 10, cols: 10, minArea: 1, maxArea: 14 },
    { until: 18, rows: 14, cols: 14, minArea: 1, maxArea: 15}
] as const;

export const FALLBACK_DIFFICULTY = {
    rows: 9,
    cols: 9,
    minArea: 3,
    maxArea: 9,
};

export const LEVEL_LABELS : Record<number, string> = {
    4: 'Very Easy', 5: 'Easy', 6: 'Medium',
    7: 'Hard', 8: 'Expert', 9: 'Cracked'
};

// Generated with AI:
// Translucent tints of Apple's system colors so tiles sit well on both
// the light and dark board surfaces.
export const TILE_COLORS = [
    "rgba(255, 159, 10, 0.45)",  // orange
    "rgba(10, 132, 255, 0.45)",  // blue
    "rgba(48, 209, 88, 0.45)",   // green
    "rgba(255, 69, 58, 0.45)",   // red
    "rgba(191, 90, 242, 0.45)",  // purple
    "rgba(255, 214, 10, 0.45)",  // yellow
    "rgba(100, 210, 255, 0.45)", // cyan
    "rgba(255, 55, 95, 0.45)",   // pink
    "rgba(102, 212, 207, 0.45)", // mint
    "rgba(94, 92, 230, 0.45)",   // indigo
    "rgba(172, 142, 104, 0.45)", // brown
    "rgba(64, 200, 224, 0.45)",  // teal
] as const;

// Used in the modal component, level presets
export const PRESETS = [
    { label: "6 x 6", rows: 6, cols: 6, minArea: 2, maxArea: 6 },
    { label: "8 x 8", rows: 8, cols: 8, minArea: 3, maxArea: 8 },
    { label: "10 x 10", rows: 10, cols: 10, minArea: 3, maxArea: 10 },
    { label: "12 x 12", rows: 12, cols: 12, minArea: 4, maxArea: 12 },
] as const;