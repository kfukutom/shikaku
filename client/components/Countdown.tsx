/**
 * Countdown component: timestamp-driven.
 * Derives the displayed number from (startsAt - now) so refreshes
 * and reconnects land at the correct moment instead of restarting.
 */

import { useState, useEffect, useRef } from "react";

interface CountdownProps {
    startsAt: number; // The timestamp when the room was joined / countdown initiated
    durationMs?: number; // How long the countdown should be (default: 5 seconds)
    onComplete: () => void;
}

export default function Countdown({ startsAt, durationMs = 5000, onComplete }: CountdownProps) {
    const [now, setNow] = useState(() => Date.now());
    
    const targetTime = startsAt + durationMs;

    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    const hasFired = useRef(false);

    useEffect(() => {
        if (targetTime - Date.now() <= 0) {
            if (!hasFired.current) {
                hasFired.current = true;
                onCompleteRef.current();
            }
            return;
        }

        const timerId = setInterval(() => {
            const currentTime = Date.now();
            setNow(currentTime);

            if (targetTime - currentTime <= 0) {
                clearInterval(timerId);
                if (!hasFired.current) {
                    hasFired.current = true;
                    onCompleteRef.current();
                }
            }
        }, 100);

        return () => clearInterval(timerId);
    }, [targetTime]);

    const secondsLeft = Math.ceil((targetTime - now) / 1000);

    return (
        <div className="text-5xl p-4 text-stone-100 font-bold flex align-middle justify-center">
            {secondsLeft > 0 ? String(secondsLeft) : "Go!"}
        </div>
    );
}