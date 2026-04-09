interface SolvedBannerProps {
    onPlayNext:() => void;
}

export default function SolvedBanner({ onPlayNext }: SolvedBannerProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            <p className="text-emerald-400 font-medium tracking-wide animate-fade-up">
                Solved!
            </p>
            <button
                onClick={onPlayNext}
                className="
                    px-6 py-2
                    border border-stone-600 hover:border-stone-400
                    text-sm tracking-wide uppercase
                    text-stone-400 hover:text-stone-200
                    transition-colors cursor-pointer
                    animate-fade-up-delay
                "
            >
                Play Next
            </button>
        </div>
    );
}