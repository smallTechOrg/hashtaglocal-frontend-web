"use client";

import { useState } from "react";
import { Link2, Loader2, MapPin, Send, ShieldCheck } from "lucide-react";
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
  /** Called after a successful post so the page can refresh. */
  onPosted: () => void;
  /**
   * The hashtag channel being viewed. Admins post here directly (no location). Regular users
   * always post via geolocation regardless of this value.
   */
  hashtag?: string;
  /** When true (admin), post to {@link hashtag} with no geolocation. */
  isAdmin?: boolean;
}

type Status = "idle" | "locating" | "posting";

export function FeedComposer({ onPosted, hashtag, isAdmin = false }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const loggedIn = typeof window !== "undefined" && isAuthenticated();

  function signIn() {
    sessionStorage.setItem(
      "report_issue_return_to",
      window.location.pathname + window.location.search,
    );
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

    const url = firstUrl(trimmed);
    const kind: FeedPostKind = url ? "LINK" : "TEXT";
    const base: CreateFeedPostRequest = {
      kind,
      text: trimmed,
      ...(url ? { link_url: url } : {}),
    };

    // Admins post to the open hashtag directly; everyone else resolves locality from coordinates.
    let payload: CreateFeedPostRequest;
    if (isAdmin) {
      const tag = (hashtag ?? "india").replace(/^#/, "");
      payload = { ...base, hashtag: tag };
    } else {
      setStatus("locating");
      try {
        const pos = await getPosition();
        payload = { ...base, lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch {
        setError("Location is required to post. Please allow location access and try again.");
        setStatus("idle");
        return;
      }
    }

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
        throw new Error(body?.error?.message ?? `Could not post (${res.status}).`);
      }
      setText("");
      onPosted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStatus("idle");
    }
  }

  if (!loggedIn) {
    return (
      <button onClick={signIn} className="xp-chat-signin">
        Sign in to join the chat
      </button>
    );
  }

  const busy = status !== "idle";
  const hasLink = Boolean(firstUrl(text));

  return (
    <div className="xp-compose">
      {error && <p className="xp-compose-error">{error}</p>}
      <div className="xp-compose-row">
        <input
          className="xp-compose-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            isAdmin
              ? `Post to ${hashtag ?? "#india"} as admin…`
              : "Send a message…"
          }
          maxLength={4000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <button
          className="xp-compose-send"
          onClick={submit}
          disabled={busy || !text.trim()}
          aria-label="Send"
        >
          {busy ? (
            <Loader2 className="xp-spin" />
          ) : hasLink ? (
            <Link2 className="xp-compose-icon" />
          ) : (
            <Send className="xp-compose-icon" />
          )}
        </button>
      </div>
      <span className="xp-compose-hint">
        {isAdmin ? (
          <>
            <ShieldCheck className="xp-compose-hint-icon" /> Admin · posts to{" "}
            {hashtag ?? "#india"}
          </>
        ) : (
          <>
            <MapPin className="xp-compose-hint-icon" /> Posts to your locality · reviewed before
            it appears
          </>
        )}
      </span>
    </div>
  );
}
