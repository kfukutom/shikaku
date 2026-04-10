interface ModalProps {
    title?: string;
    onClose: () => void;
}

//TODO
/**
 * - game customization interface
 * - confirmation logic?
 * - alternative button for joining a room, hooking that with the backend/server component
 */

function Modal({title = "Confirm", onClose}: ModalProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 animate-fade-up-fast">
            <div className="bg-stone-800 border border-stone-600 rounded-3xl p-6 max-w-sm w-full">
                <h2 className="text-stone-200 text-lg font-semibold mb-2">
                    { title }
                </h2>

                <button 
                    onClick={onClose}
                    className="px-4 py-1.5 text-sm text-stone-400 hover:text-stone-300 border border-stone-600 hover:border-stone-500 rounded cursor-pointer"
                >
                    Cancel
                </button>
            </div>
        </div>
    )
}

export default Modal;