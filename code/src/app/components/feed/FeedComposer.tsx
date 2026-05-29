"use client";

import { useState } from "react";
import { Link2, Loader2, MapPin, Send } from "lucide-react";
import { API_PATHS } from "../../constants/api";
import { getAccessToken, buildGoogleAuthUrl, isAuthenticated } from "../../ops/lib/auth";
import { GOOGLE_CLIENT_ID } from "../../ops/lib/constants";
import type { CreateFeedPostRequest, FeedPostKind } from "../../models/feed";

/** Detects a leading/inline URL so a plain paste becomes a LINK post. */
function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/i);
  return m ? m[0] : null;
}

interface Props {
  /** Called after a successful post so the page can refresh / show a hint. */
  onPosted: () => void;
}

type Status = "idle" | "locating" | "posting";

export function FeedComposer({ onPosted }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const loggedIn = typeof window !== "undefined" && isAuthenticated();

  function signIn() {
    sessionStorage.setItem("report_issue_return_to", window.location.pathname + window.location.search);
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = buildGoogleAuthUrl(GOOGLE_CLIENT_ID, redirectUri);
  }

  function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Location is not available in this browser"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
      });
    });
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    const token = getAccessToken();
    if (!token) {
      signIn();
      return;
    }

    setError(null);
    setInfo(null);
    setStatus("locating");

    let coords: { lat: number; lng: number };
    try {
      const pos = await getPosition();
      coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      setError("Location is required to post. Please allow location access and try again.");
      setStatus("idle");
      return;
    }

    const url = firstUrl(trimmed);
    const kind: FeedPostKind = url ? "LINK" : "TEXT";
    const payload: CreateFeedPostRequest = {
      kind,
      lat: coords.lat,
      lng: coords.lng,
      text: trimmed,
      ...(url ? { link_url: url } : {}),
    };

    setStatus("posting");
    try {
      const res = await fetch(API_PATHS.feed, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        signIn();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg =
          body?.error?.message ?? `Could not post (${res.status}). Please try again.`;
        throw new Error(msg);
      }
      setText("");
      setInfo("Posted! It'll appear once it clears review.");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  if (!loggedIn) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white p-3">
        <span className="text-sm text-zinc-500">Sign in to post to this hashtag</span>
        <button
          onClick={signIn}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          Sign in
        </button>
      </div>
    );
  }

  const busy = status !== "idle";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share something with your neighbourhood… (paste a link to share an article)"
        rows={2}
        maxLength={4000}
        className="w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      {info && <p className="text-xs text-emerald-600">{info}</p>}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-zinc-400">
          <MapPin className="h-3 w-3" /> Location is used to post to the right hashtag
        </span>
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {status === "locating" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Locating…
            </>
          ) : status === "posting" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Posting…
            </>
          ) : firstUrl(text) ? (
            <>
              <Link2 className="h-4 w-4" /> Share link
            </>
          ) : (
            <>
              <Send className="h-4 w-4" /> Post
            </>
          )}
        </button>
      </div>
    </div>
  );
}
