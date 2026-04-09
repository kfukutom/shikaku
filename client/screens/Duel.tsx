export default function Duel() {
    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-6">
            <h1 className="text-2xl font-bold tracking-wide uppercase">Duel Mode</h1>
            <p className="text-stone-400 text-sm tracking-wide text-center max-w-xs">
                Create a game and share the link with a friend. The puzzle starts when both players join.
            </p>

            <a
                href="/shikaku/"
                className="text-xs tracking-widest uppercase text-stone-600 hover:text-stone-400 transition-colors duration-200 mt-4"
            >
                ← Back to solo
            </a>
        </div>
    );
}