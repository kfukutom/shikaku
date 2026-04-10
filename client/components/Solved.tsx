import PrimaryBtn from "./PrimaryBtn";

interface SolvedBannerProps {
    onPlayNext:() => void;
}

export default function SolvedBanner({ onPlayNext }: SolvedBannerProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            <p className="text-emerald-400 font-medium tracking-wide animate-fade-up">
                Solved!
            </p>

            <PrimaryBtn text="Play Next" handleEvent={onPlayNext}/>
        </div>
    );
}