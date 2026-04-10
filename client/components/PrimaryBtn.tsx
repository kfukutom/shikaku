interface buttonProps {
    text: string;
    handleEvent: () => void;
}

function PrimaryBtn({ text, handleEvent }: buttonProps) {
    return (
        <button
            onClick={handleEvent}
            className="
                px-6 py-2
                border border-stone-600 hover:border-stone-500
                text-sm tracking-wide uppercase
                text-stone-400 hover:text-stone-300
                transition-colors cursor-pointer
                animate-fade-updelay
            "
        >
            {text}
        </button>
    )
}

export default PrimaryBtn;