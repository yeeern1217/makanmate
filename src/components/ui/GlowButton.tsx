"use client";
import Link from "next/link";

export default function GlowButton({
  href,
  children,
  onClick,
  disabled = false,
  className = "",
  size = "md",
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = size === "sm" ? "px-6 py-2.5 text-base" : "px-8 py-4 text-lg";
  const classes =
    `inline-block rounded-full font-bold text-white bg-[var(--accent-primary)] border-2 border-[var(--accent-primary)] shadow-[0_4px_0_var(--border),0_6px_20px_rgba(196,85,58,0.3)] hover:shadow-[0_2px_0_var(--border),0_4px_14px_rgba(196,85,58,0.4)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all duration-150 cursor-pointer text-center disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none ${sizeClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
