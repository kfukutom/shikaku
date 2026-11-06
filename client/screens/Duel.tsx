import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PrimaryBtn from "../components/PrimaryBtn";
import NavBar from "../components/NavBar";
import Modal from "../components/Modal";

export default function Duel() {
    const [showModal, setShowModal] = useState(false);
    const navigate = useNavigate();

    function handleCreated(sessionId: string) {
        navigate(`/duel/${sessionId}`);
    }

    return (
        <>
            <NavBar back={{ href: "/shikaku/", label: "Solo" }} title="Duel" />
            <div className={`
                min-h-dvh bg-canvas text-label flex flex-col items-center
                justify-center gap-8 px-6 pt-13 transition-[filter] duration-300 ease-apple
                ${showModal ? "blur-xs" : ""}
            `}>
                <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                    {/* two offset tiles, SF Symbol-ish mark */}
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface shadow-card ring-1 ring-separator">
                        <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
                            <rect x="4" y="4" width="15" height="15" rx="4" fill="currentColor" className="text-label-tertiary" />
                            <rect x="13" y="13" width="15" height="15" rx="4" fill="currentColor" className="text-label" />
                        </svg>
                    </div>

                    <h1 className="text-[28px] font-semibold tracking-[-0.02em]">
                        Play a friend
                    </h1>
                    <p className="text-[15px] leading-relaxed text-label-secondary">
                        Create a game and share the link with a friend. The puzzle starts when both players join.
                    </p>
                </div>

                <PrimaryBtn text="Create New Room" handleEvent={() => setShowModal(true)} />
            </div>

            {showModal && (
                <Modal
                    onClose={() => setShowModal(false)}
                    onCreated={handleCreated}
                />
            )}
        </>
    );
}
