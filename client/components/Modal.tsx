import { useState } from "react";
import { PRESETS } from "../utils/constants";
const API_URL = import.meta.env.VITE_API_URL;

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
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-fade-up-fast">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative bg-stone-800 border border-stone-700 px-7 py-6 w-80">

                <h2 className="text-stone-100 text-base font-italic tracking-widest mb-1">
                    New Duel
                </h2>
                <p className="text-stone-500 text-xs mb-5">
                    Let's choose a grid size, then you may send the link to a friend or whomever.
                </p>

                {/* grid size selector */}
                <div className="grid grid-cols-4 gap-1.5 mb-6">
                    { PRESETS.map((p, i) => (
                        <button
                            key={p.label}
                            onClick={()=>setSelected(i)}
                            className={`
                                py-2.5 text-xs tracking-wide rounded-lg cursor-pointer
                                transition-all duration-150
                                ${selected === i
                                    ? "bg-stone-100 text-stone-900 font-medium"
                                    : "bg-stone-750 text-stone-400 hover:text-stone-200 hover:bg-stone-700"
                                }
                            `}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <p className="text-red-400/80 text-xs mb-4 -mt-2">{error}</p>
                )}

                {/* actions */}
                <button
                    onClick={handleCreate}
                    disabled={loading}
                    className="w-full py-2.5 text-xs tracking-widest uppercase
                               text-stone-500 hover:text-stone-300
                               border border-stone-600 hover:border-stone-500
                               cursor-pointer transition-colors duration-200
                               disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {loading ? "Creating..." : "Create Room"}
                </button>

                <button
                    onClick={onClose}
                    className="w-full mt-2 py-2 text-xs tracking-widest uppercase
                               text-stone-600 hover:text-stone-400
                               cursor-pointer transition-colors duration-200"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default Modal;