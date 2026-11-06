interface HeaderProps {
    grid: string;
    level: string;
}

export default function Header({ grid, level } : HeaderProps) {
    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-label">
                Unlimited Shikaku
            </h1>

            <p className="pill">
                <span>{grid}</span>
                <span className="text-label-quaternary">·</span>
                <span>{level}</span>
            </p>
        </div>
    );
}
