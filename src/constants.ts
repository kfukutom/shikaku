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
    4: 'Super Easy', 5: 'Easy', 6: 'Medium',
    7: 'Hard', 8: 'Expert', 9: 'GMI'
};