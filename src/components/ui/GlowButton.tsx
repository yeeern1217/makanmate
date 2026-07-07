"use client";
import Link from "next/link";

export default function GlowButton({
  href,
  children,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const classes =
    "inline-block px-8 py-4 rounded-full font-bold text-lg text-black bg-[#39ff14] shadow-[0_0_20px_#39ff14,0_0_60px_#39ff1466] hover:shadow-[0_0_30px_#39ff14,0_0_80px_#39ff1488] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer text-center";

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
