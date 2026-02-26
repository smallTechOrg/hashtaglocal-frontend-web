"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ADMIN_API } from "../../lib/constants";
import { saveTokens } from "../../lib/auth";
import { Loader2, AlertCircle } from "lucide-react";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const exchangedRef = useRef(false); // prevent React Strict Mode double-fire

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
        // Step 1: Exchange auth code for tokens
        const res = await fetch(ADMIN_API.googleCallback(authCode));
        if (!res.ok) {
          const text = await res.text();
          setError(`Token exchange failed (${res.status}): ${text}`);
          return;
        }

        const json = await res.json();
        const data = json.data;

        saveTokens({
          accessToken: {
            value: data.access_token.value,
            expiry: data.access_token.expiry,
          },
          refreshToken: {
            value: data.refresh_token.value,
            expiry: data.refresh_token.expiry,
          },
        });

        // Step 2: Verify the user is actually an admin
        try {
          const verifyRes = await fetch(ADMIN_API.pendingActions, {
            headers: { Authorization: `Bearer ${data.access_token.value}` },
          });

          if (verifyRes.status === 403) {
            saveTokens({
              accessToken: { value: "", expiry: 0 },
              refreshToken: { value: "", expiry: 0 },
            });
            setError(
              "Access denied. Your account does not have admin privileges.",
            );
            return;
          }
        } catch {
          // Admin verification failed but tokens are valid — proceed anyway
          console.warn("Admin verification fetch failed, proceeding to review");
        }

        router.replace("/ops/review");
      } catch (err) {
        setError(`Failed to authenticate: ${err}`);
      }
    }

    exchangeCode(code);
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4 p-8 rounded-xl bg-zinc-900 border border-red-800 max-w-md w-full mx-4">
          <AlertCircle className="w-10 h-10 text-red-500" />
          <p className="text-red-400 text-center text-sm">{error}</p>
          <a
            href="/ops"
            className="text-zinc-400 hover:text-white text-sm underline"
          >
            Back to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
        <p className="text-zinc-500 text-sm">Authenticating...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
