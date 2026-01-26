"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Check if this is a dynamic issue route
    const path = window.location.pathname;
    const issueMatch = path.match(/^\/issue\/([^/]+)$/);
    
    if (issueMatch) {
      // Redirect to the issue page with the ID
      router.replace(`/issue/index?id=${issueMatch[1]}`);
    }
  }, [router]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Page Not Found</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/">Go back home</Link>
    </div>
  );
}
