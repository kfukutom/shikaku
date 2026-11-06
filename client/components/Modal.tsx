import { useState } from "react";
import { PRESETS } from "../utils/constants";
const API_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

interface ModalProps {
    onClose:() => void;
    onCreated: (sessionId: string) => void;
};

function Modal({ onClose, onCreated }: ModalProps) {
    const [selected, setSelected] = useState(1); // defaults to the first in the PRESETS array (6 by 6)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null> (null);

    async function handleCreate() {
        setLoading(true);
        setError(null);

        const preset = PRESETS[selected];

        try {
            const res = await fetch(`${API_URL}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rows: preset.rows,
                    cols: preset.cols,
                    minArea: preset.minArea,
                    maxArea: preset.maxArea,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to create a room');
            }

            const { sessionId } = await res.json();
            onCreated(sessionId);
        } catch (err) {
            setError(`${String(err)}`);
            setLoading(false);
        }
    } // async handleCreate() - POST

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/30 animate-fade-in" onClick={onClose} />

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="new-duel-title"
                className="glass relative w-[340px] rounded-[28px] px-6 pt-6 pb-5
                           ring-1 ring-separator shadow-sheet animate-sheet-in"
            >
                <h2 id="new-duel-title" className="text-center text-[17px] font-semibold tracking-[-0.01em] text-label">
                    New Duel
                </h2>
                <p className="mt-1.5 text-center text-[13px] leading-snug text-label-secondary">
                    Choose a grid size, then share the link with a friend.
                </p>

                {/* grid size selector (segmented control) */}
                <div role="radiogroup" aria-label="Grid size" className="mt-5 flex rounded-[9px] bg-fill-tertiary p-0.5">
                    { PRESETS.map((p, i) => (
                        <button
                            key={p.label}
                            type="button"
                            role="radio"
                            aria-checked={selected === i}
                            onClick={()=>setSelected(i)}
                            className={`
                                flex-1 rounded-[7px] py-1.5 text-[13px] font-medium tabular-nums
                                cursor-pointer transition-all duration-200 ease-apple
                                ${selected === i
                                    ? "bg-segment text-label shadow-segment"
                                    : "text-label-secondary hover:text-label"
                                }
                            `}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <p className="mt-3 text-center text-[12px] text-red">{error}</p>
                )}

                {/* actions */}
                <button
                    type="button"
                    onClick={handleCreate}
                    disabled={loading}
                    className="btn btn-filled mt-5 w-full"
                >
                    {loading ? "Creating…" : "Create Room"}
                </button>

                <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-plain mt-1.5 w-full"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default Modal;