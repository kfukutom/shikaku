// shuffle a subset of the array (first n elements get randomized)
export function partialShuffle<T>(arr: T[], n?: number) : void {
    const count = Math.min(n ?? Math.ceil(arr.length / 2), arr.length);

    for (let i = 0; i < count; ++i) {
        const j = i + Math.floor(Math.random() * (arr.length - i));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

// fisher-yates in place
export function fullShuffle<T>(arr: T[]) : void {
    for (let i = arr.length - 1; i > 0; --i) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}