import type { HeaderProps } from "../types";

export default function Header({ grid, level } : HeaderProps) {
    return (
        <div className="flex flex-col items-center gap-2">
            <h1 className="text-2xl font-bold tracking-wide uppercase">
                Unlimited Shikaku
            </h1>

            <p className="text-stone-500 text-sm tracking-wide">
                <a className="underline hover:text-stone-600 ease-in-out" href="https://github.com/kfukutom/shikaku" target="_blank" rel="noopener noreferrer"> View Github </a>
            </p>

            <p className="text-stone-600 text-xs tracking-wide uppercase">
                {grid} · {level}
            </p>
        </div>
    );
}