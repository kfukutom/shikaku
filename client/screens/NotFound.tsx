export default function NotFound() {
    return (
        <div className="min-h-dvh bg-canvas text-label flex flex-col items-center justify-center gap-5 px-6 text-center">
            <p className="text-[80px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-label-quaternary">
                404
            </p>

            <div className="flex flex-col gap-1.5">
                <h1 className="text-[22px] font-semibold tracking-[-0.02em]">This page doesn&apos;t exist.</h1>
                <p className="text-[15px] text-label-secondary">Sorry, it seems like the link is broken or the page was moved.</p>
            </div>

            <a href="/shikaku/" className="btn btn-filled mt-2">
                Back to game
            </a>
        </div>
    )
}
