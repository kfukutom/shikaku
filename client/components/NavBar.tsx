import type { ReactNode } from "react";

interface NavBarProps {
    title?: string;
    back?: { href: string; label: string };
    children?: ReactNode;
}

/**
 * Fixed, frosted-glass top bar. Back link on the left, centered title,
 * and an optional slot of actions (see NavLink) on the right.
 */
export default function NavBar({ title, back, children }: NavBarProps) {
    return (
        <nav className="glass fixed inset-x-0 top-0 z-40 border-b border-separator">
            <div className="mx-auto flex h-13 max-w-6xl items-center px-5">
                <div className="flex flex-1 items-center">
                    {back && (
                        <a
                            href={back.href}
                            className="btn btn-plain -ml-3 gap-0.5 pl-1.5 pr-3 text-label"
                        >
                            <svg width="12" height="20" viewBox="0 0 12 20" aria-hidden="true">
                                <path
                                    d="M9.5 2.5 2.5 10l7 7.5"
                                    fill="none" stroke="currentColor" strokeWidth="2.2"
                                    strokeLinecap="round" strokeLinejoin="round"
                                />
                            </svg>
                            {back.label}
                        </a>
                    )}
                </div>

                {title && (
                    <span className="text-[15px] font-semibold tracking-[-0.01em] text-label">
                        {title}
                    </span>
                )}

                <div className="flex flex-1 items-center justify-end gap-1">
                    {children}
                </div>
            </div>
        </nav>
    );
}

interface NavLinkProps {
    href: string;
    children: ReactNode;
    external?: boolean;
}

export function NavLink({ href, children, external = false }: NavLinkProps) {
    return (
        <a
            href={href}
            className="rounded-full px-3 py-1 text-[13px] font-medium text-label-secondary
                       transition-colors duration-200 hover:bg-fill-quaternary hover:text-label"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
            {children}
        </a>
    );
}
