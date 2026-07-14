"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", emoji: "\u{1F3E0}" },
  { href: "/radar", label: "Radar", emoji: "\u{1F4E1}" },
  { href: "/scan", label: "Catch", emoji: "\u{1F4F7}" },
  { href: "/pokedex", label: "Collection", emoji: "\u{1F0CF}" },
  { href: "/trail", label: "Trail", emoji: "\u{1F5FA}" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                active
                  ? "text-[var(--accent-primary)] font-bold"
                  : "text-[var(--text-muted)]"
              }`}
            >
              <span className="text-xl">{tab.emoji}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
