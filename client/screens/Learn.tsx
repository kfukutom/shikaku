import { useState, useEffect, useRef } from "react";
import NavBar from "../components/NavBar";

type visualTypes = 'numbers-only' | 'one-rect' | 'area-count';
type SectionCard = {
    id: number;
    eyebrow: string;
    title: string;
    body: string;
    visual: visualTypes;
};

const sections: SectionCard[] = [
    {
        id: 0,
        eyebrow: '01 — The grid',
        title: 'Every puzzle starts with just numbers.',
        body: 'Shikaku is played on a simple, rectangular grid. There exists a handful of cells containing a number - these are your clues.',
        visual: 'numbers-only',
    },
    {
        id: 1,
        eyebrow: '02 — One number, one rectangle',
        title: 'Each clue belongs to its own rectangle.',
        body: 'Your job is very simple: draw rectangles that divide the entire grid. Partition them so that each contains exactly one numbered cell — never two, never zero.',
        visual: 'one-rect',
    }
];

export default function Learn() {
    const [activeIndex, setActiveIndex] = useState(0);
    const sectionRefs = useRef<(HTMLDivElement|null)[]>([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
                
                if (visible) {
                    const idx = sectionRefs.current.findIndex((ref) => ref === visible.target);
                    if (idx !== -1) {
                        setActiveIndex(idx);
                    }
                }
            },
            {
                rootMargin: "-40% 0px -40% 0px", threshold: 0
            }
        );

        sectionRefs.current.forEach((childref) => {
            if (childref) {
                observer.observe(childref);
            }
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-dvh bg-canvas text-label">

            <NavBar back={{ href: "/shikaku/", label: "Shikaku" }} title="Learn" />

            {/* 1: a generic title card */}
            <header className="mx-auto max-w-6xl px-8 pt-36 pb-28">
                <p className="mb-5 text-[15px] font-medium text-label-tertiary">
                    A one-minute primer
                </p>

                <h1 className="text-[56px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
                    How to play <span className="text-label-secondary">Shikaku</span>
                </h1>

                <p className="mt-6 max-w-lg text-[21px] leading-relaxed text-label-secondary">
                    Four rules. One grid. Scroll through to see how they fit together.
                </p>
            </header>

            {/* Storytelling layout: copy scrolls on the left, visual stays pinned on the right */}
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-8 md:grid-cols-2">
                {/* LEFT ITEMS */}
                <div>
                    {sections.map((section, i) => (
                        <div
                            key={section.id}
                            ref={(el) => {
                                sectionRefs.current[i] = el;
                            }}
                            className="flex min-h-screen items-center"
                        >
                            <div
                                className={`transition-opacity duration-500 ${
                                    activeIndex === i ? "opacity-100" : "opacity-30"
                                }`}
                            >
                                <p className="mb-4 text-[13px] font-medium tabular-nums text-label-tertiary">
                                    {section.eyebrow}
                                </p>
                                <h2 className="mb-5 text-[40px] font-semibold leading-[1.1] tracking-[-0.025em]">
                                    {section.title}
                                </h2>
                                <p className="max-w-md text-[19px] leading-relaxed text-label-secondary">
                                    {section.body}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Stick Grid, right item */}
                <div className="hidden md:block">
                    <div className="sticky top-0 flex h-screen items-center">
                        <div className="relative aspect-square w-full rounded-3xl bg-surface p-8 shadow-card ring-1 ring-separator">
                            {/* Shikaku grid rendered here */}

                            {sections.map((section, i) => (
                                <div
                                    key={section.id}
                                    className="absolute inset-0 flex items-center justify-center p-8 transition-opacity duration-700 ease-out"
                                    style={{opacity: activeIndex === i ? 1:0}}
                                >
                                    { /* <LearnGrid visual={section.visual} /> */ }
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// type Rectangle = {
//     row: number;
//     col: number;
//     w: number;
//     h: number;
//     hue: 'amber' | 'sky' | 'emerald' | 'rose';  // strict hue types for this demo
// };

// const PUZZLE_COLS: number = 4;
// const PUZZLE_ROWS = 4;

// function LearnGrid({ visual }: { visual: visualTypes }) {
    
//     // change the demonstrated clue placement based on step
//     const rectArray: Rectangle[] = (() => {
//         switch(visual) {
//             case 'numbers-only': return [];
//             case 'one-rect': return [];
//         }
//     })();

//     const cellSize = 64;
//     const padding = 12;
//     const width = PUZZLE_COLS * cellSize + padding * 2;
//     const height = PUZZLE_ROWS * cellSize + padding * 2;

//     return (
//         <svg
//             viewBox={`0 0 ${width} ${height}`}
//             className='w-full h-full max-w-md'
//             xmlns="http://www.w3.org/2000/svg"
//         >

//         </svg>
//     );
// }