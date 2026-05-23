"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { BASE_URL } from "../../constants/api";
import { saveTokens } from "../../ops/lib/auth";
import { Loader2, AlertCircle } from "lucide-react";

const REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "http://localhost:3000/auth/callback";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const exchangedRef = useRef(false);

  useEffect(() => {
    if (exchangedRef.current) return;
    exchangedRef.current = true;

    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code received from Google.");
      return;
    }

    async function exchangeCode(authCode: string) {
      try {
        const callbackUrl = `${BASE_URL}/auth/google/callback?code=${encodeURIComponent(authCode)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
        const res = await fetch(callbackUrl);
        if (!res.ok) {
          const text = await res.text();
          setError(`Sign-in failed (${res.status}): ${text}`);
          return;
        }

        const json = await res.json();
        const data = json.data;

        saveTokens({
          accessToken: { value: data.access_token.value, expiry: data.access_token.expiry },
          refreshToken: { value: data.refresh_token.value, expiry: data.refresh_token.expiry },
        });

        // Return to the page the user came from.
        // Default includes ?autoopen=report so the modal always triggers even if
        // sessionStorage was lost (e.g. Chrome Custom Tab / SFSafariViewController).
        const returnTo = sessionStorage.getItem("report_issue_return_to") ?? "/?autoopen=report";
        sessionStorage.removeItem("report_issue_return_to");
        // Also set the sessionStorage flag as a belt-and-suspenders fallback.
        sessionStorage.setItem("report_issue_pending", "1");
        window.location.replace(returnTo);
      } catch (err) {
        setError(`Failed to authenticate: ${err}`);
      }
    }

    exchangeCode(code);
  }, [searchParams]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 max-w-md w-full mx-4 text-center">
          <AlertCircle className="w-10 h-10" style={{ color: "var(--color-rusty-spice)" }} />
          <p style={{ color: "var(--color-ink-black)" }} className="text-sm">{error}</p>
           <Link href="/" className="text-sm underline" style={{ color: "var(--color-dark-teal)" }}>
             Back to home
           </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-green)" }} />
        <p className="text-sm" style={{ color: "#4b5563" }}>Signing you in…</p>
      </div>
    </div>
  );
}

export default function PublicAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--color-green)" }} />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
