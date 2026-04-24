interface HeaderProps {
    grid: string;
    level: string;
}

export default function Header({ grid, level } : HeaderProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold tracking-widest uppercase">
                Unlimited Shikaku
            </h1>

            <p className="text-stone-500 text-sm tracking-wide flex gap-3">
                <a className="underline hover:text-stone-300 ease-in-out transition-colors duration-200" href="https://github.com/kfukutom/shikaku" target="_blank" rel="noopener noreferrer">Github</a>
                <span className="text-stone-700">·</span>
                <a className="underline hover:text-stone-300 ease-in-out transition-colors duration-200" href="/shikaku/duel">Duel</a>
                <span className="text-stone-700">·</span>
                <a className="underline hover:text-stone-300 ease-in-out transition-colors duration-200" href="/shikaku/learn">Learn</a>
            </p>

            <p className="text-stone-600 text-xs tracking-widest uppercase">
                {grid} · {level}
            </p>
        </div>
    );
}