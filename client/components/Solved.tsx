import PrimaryBtn from "./PrimaryBtn";

interface SolvedBannerProps {
    onPlayNext:() => void;
}

export default function SolvedBanner({ onPlayNext }: SolvedBannerProps) {
    return (
        <div className="flex flex-col items-center gap-4 animate-fade-up">
            <p className="flex items-center gap-2 text-[17px] font-semibold text-green">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                    <circle cx="11" cy="11" r="11" fill="currentColor" />
                    <path
                        d="m6.5 11.5 3 3 6-7"
                        fill="none" stroke="var(--surface)" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round"
                    />
                </svg>
                Solved
            </p>

            <PrimaryBtn text="Play Next" handleEvent={onPlayNext}/>
        </div>
    );
}
