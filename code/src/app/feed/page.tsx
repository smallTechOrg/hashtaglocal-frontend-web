import { Suspense } from "react";
import FeedClient from "./FeedClient";

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
