export default function NotFound() {
    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-4">
            <h1 className="text-6xl font-bold text-stone-500">
                404
            </h1>

            <p className="text-stone-400 tracking-wide">This page doesn't exist.</p>
            <a
                href="/shikaku/"
                className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-300 transition-colors duration-200 px-3 py-1"
            >
                Back to game
            </a>

        </div>
    )
}