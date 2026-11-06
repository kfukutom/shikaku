interface buttonProps {
    text: string;
    handleEvent: () => void;
    variant?: "filled" | "tinted" | "plain";
    disabled?: boolean;
    className?: string;
}

function PrimaryBtn({ text, handleEvent, variant = "filled", disabled = false, className = "" }: buttonProps) {
    return (
        <button
            type="button"
            onClick={handleEvent}
            disabled={disabled}
            className={`btn btn-${variant} ${className}`}
        >
            {text}
        </button>
    )
}

export default PrimaryBtn;
