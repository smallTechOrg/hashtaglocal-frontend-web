"use client";

import "./ops.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated, clearTokens } from "./lib/auth";
import { useEffect, useState } from "react";
import {
  Shield,
  List,
  LogOut,
  ArrowLeft,
  History,
  MessagesSquare,
} from "lucide-react";
import { Toaster } from "sonner";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isLoginPage = pathname === "/ops" || pathname === "/ops/auth/callback";

  useEffect(() => {
    setMounted(true);
    setAuthed(isAuthenticated());
  }, [pathname]);

  function handleLogout() {
    clearTokens();
    setAuthed(false);
    router.push("/ops");
  }

  // Don't render anything until mounted (avoid hydration mismatch)
  if (!mounted) return null;

  // Login/callback pages get minimal chrome
  if (isLoginPage) {
    return (
      <div className="ops-portal min-h-screen bg-zinc-950 text-zinc-100">
        <Toaster richColors position="top-center" />
        {children}
      </div>
    );
  }

  // Protected pages — redirect to login if not authed
  if (!authed) {
    router.push("/ops");
    return null;
  }

  return (
    <div className="ops-portal min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Toaster richColors position="top-center" />
      {/* Nav bar */}
      <nav className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-bold text-sm tracking-wide text-zinc-300">
            #local ops
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/ops/review"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
              pathname === "/ops/review"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Review</span>
          </Link>
          <Link
            href="/ops/list"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
              pathname === "/ops/list"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Bulk</span>
          </Link>
          <Link
            href="/ops/history"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
              pathname === "/ops/history"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </Link>
          <Link
            href="/ops/feed"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition ${
              pathname === "/ops/feed"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <MessagesSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Feed</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md text-zinc-400 hover:text-red-400 hover:bg-zinc-800/50 transition ml-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
