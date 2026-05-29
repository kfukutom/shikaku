import { useState, useEffect, useRef } from "react";
import NavBar from "../components/NavBar";

type SectionCard = {
    id: number;
    eyebrow: string;
    title: string;
    body: string;
};

const sections: SectionCard[] = [
    {
        id: 0,
        eyebrow: '01 - The grid',
        title: 'Every puzzle starts with just numbers.',
        body: 'Shikaku is played on a simple, rectangular grid. There exists a handful of cells containing a number - these are your clues.',
    },
    {
        id: 1,
        eyebrow: '02 - One number, one rectangle',
        title: 'Each clue belongs to its own rectangle.',
        body: 'Your job is very simple: draw rectangles that divide the entire grid. Partition them so that exatly one numbered cell - never two, never zero.',
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
        <div className="min-h-screen bg-stone-900 text-stone-100">

            <NavBar text="Back" section="Learn" />

            {/* 1: a generic title card */}
            <header className="max-w-6xl mx-auto px-8 pt-10 pb-16">
                <p className="text-xs tracking-widest uppercase text-stone-500 mb-6">
                    A one-minute primer
                </p>

                <h1 className="text-5xl md:text-6xl tracking-tight leading-tight">
                    How to play <span className="italic text-stone-400">Shikaku</span>
                </h1>

                <p className="text-stone-400 mt-6 max-w-lg leading-relaxed">
                    Four rules. One grid. Scroll through to see how they fit together.
                </p>
            </header>

            {/* Storytelling layout */}
            <div className="max-w-6xl mx-auto px-8 grid grid-col gap-12">
                {/* LEFT ITEMS */}
                <div>
                    {sections.map((section, i) => (
                        <div
                            key={section.id}
                            ref={(el) => {
                                sectionRefs.current[i] = el;
                            }}
                            className="min-h-screen flex items-center"
                        >
                            <div
                                className={`transition-opacity duration-500 ${
                                    activeIndex === i ? "opacity-100" : "opacity-30"
                                }`}
                            >
                                <p className="text-xs tracking-widest uppercase text-stone-500 mb-4">
                                    {section.eyebrow}
                                </p>
                                <h2 className="text-4xl tracking-tight mb-6 leading-tight">
                                    {section.title}
                                </h2>
                                <p className="text-lg text-stone-400 leading-relaxed max-w-md">
                                    {section.body}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}