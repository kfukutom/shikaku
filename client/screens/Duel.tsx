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
            <NavBar text="Back to solo" section="Duel" />
            <div className={`
                min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center
                justify-center gap-6 transition-all duration-200
                ${showModal ? "blur-xs" : ""}
            `}>
                <p className="text-stone-400 text-sm tracking-wide text-center max-w-xs">
                    Create a game and share the link with a friend. The puzzle starts when both players join.
                </p>

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