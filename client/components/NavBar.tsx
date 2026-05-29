export default function NavBar({ text, section }: { text: string, section: string }) {
    return (
        <nav className="max-w-6xl mx-auto px-8 pt-8 flex justify-between items-center">
            <a href="/shikaku/" className="text-xs tracking-widest uppercase text-stone-500 hover:text-stone-300 transition-colors duration-200">
                ← { text }
            </a>
            <span className="text-xs tracking-widest uppercase text-stone-600">
                { section }
            </span>
        </nav>
    );
}