"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
  const router = useRouter();
  // Until we know whether this is a redirectable deep link (issue/update), show a neutral loading
  // state — never the "Page Not Found" message, which otherwise flashes before the client-side
  // redirect lands on the real issue/update page.
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const path = window.location.pathname;
    const search = window.location.search;
    const issueMatch = path.match(/^\/issue\/([^/]+)$/);
    const updateCameraMatch = path.match(/^\/update\/([^/]+)\/camera/);
    const updateFormMatch = path.match(/^\/update\/([^/]+)\/form/);

    if (issueMatch) {
      router.replace(`/issue/index?id=${issueMatch[1]}`);
    } else if (updateCameraMatch) {
      const id = updateCameraMatch[1];
      const type = new URLSearchParams(search).get("type") ?? "";
      router.replace(`/update/index/camera?id=${id}&type=${encodeURIComponent(type)}`);
    } else if (updateFormMatch) {
      const id = updateFormMatch[1];
      const type = new URLSearchParams(search).get("type") ?? "";
      router.replace(`/update/index/form?id=${id}&type=${encodeURIComponent(type)}`);
    } else {
      // Genuinely unknown route — show the real not-found message.
      setRedirecting(false);
    }
  }, [router]);

  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Page Not Found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/">Go back home</Link>
    </div>
  );
}
