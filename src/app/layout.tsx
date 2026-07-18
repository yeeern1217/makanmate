import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/nav/BottomNav";

export const metadata: Metadata = {
  title: "MakanMate",
  description: "Hunt and capture legendary Malaysian heritage food stalls",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MakanMate",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf3e0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-[100dvh] overflow-hidden flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <div className="min-h-0 flex-1 flex flex-col pb-[72px]">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
