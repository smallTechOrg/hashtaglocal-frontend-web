"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Sub-tabs under Ops → Events. Add a tab here to put a new events page under the Events top tab. */
const EVENT_TABS: { href: string; label: string }[] = [
  { href: "/ops/events", label: "Review" },
  { href: "/ops/events/sources", label: "Sources" },
];

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The most specific tab whose path matches is the active one.
  const active = [...EVENT_TABS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href;

  return (
    <>
      <div className="border-b border-zinc-800 bg-zinc-950">
        <nav className="max-w-7xl mx-auto px-4 flex gap-1" aria-label="Events sections">
          {EVENT_TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active === t.href ? "page" : undefined}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition ${
                active === t.href
                  ? "border-white text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </>
  );
}
