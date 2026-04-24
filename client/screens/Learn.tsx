// Learn page

export default function Learn() {
    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-4">
            <h1 className="text-5xl font-bold text-stone-500 fade-in ease-in">
                Coming Soon...
            </h1>
            <a
                href="/shikaku/"
                className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-300 transition-colors duration-200 px-3 py-1"
            >
                Back to game
            </a>
        </div>
    )
}