import type { Metadata } from "next";
import { Suspense } from "react";
import FeedClient from "./FeedClient";

export const metadata: Metadata = {
  title: "Community Feed — Civic Updates from Your Neighbourhood | #local",
  description:
    "Latest civic updates, bulletins and reported issues from neighbourhoods on #local. Follow what your community is reporting and fixing.",
  alternates: { canonical: "/feed" },
};

export default function FeedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-zinc-400">
          Loading…
        </div>
      }
    >
      <FeedClient />
    </Suspense>
  );
}
