import { useState } from "react";
import PrimaryBtn from "../components/PrimaryBtn";
import Modal from "../components/Modal";

export default function Duel() {

    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <div className={
                    `min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center
                    justify-center gap-6 transition-all duration-200 ${showModal ? "blur-xs" : ""}
                `}
            >
                <h1 className="text-2xl font-bold tracking-widest uppercase">Duel Mode</h1>
                <p className="text-stone-400 text-sm tracking-wide text-center max-w-xs">
                    Create a game and share the link with a friend. The puzzle starts when both players join.
                </p>

                <PrimaryBtn text="Create New Room" handleEvent={() => setShowModal(true)} />

                <a
                    href="/shikaku/"
                    className="text-xs tracking-widest uppercase text-stone-600 hover:text-stone-400 transition-colors duration-200 mt-4"
                >
                    ← Back to solo
                </a>
            </div>

            {showModal && <Modal onClose={() => setShowModal(false)} />}
        </>
    );
}