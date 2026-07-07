import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="text-6xl mb-6">📡</div>
      <h1 className="text-2xl font-bold mb-3">You are offline</h1>
      <p className="text-gray-400 mb-6 max-w-sm">
        MakanMate needs an internet connection for AI scanning and map features.
        Previously visited Pokedex pages are still available.
      </p>
      <Link
        href="/"
        className="text-[#39ff14] underline underline-offset-4 hover:no-underline"
      >
        Back to Home
      </Link>
    </div>
  );
}
