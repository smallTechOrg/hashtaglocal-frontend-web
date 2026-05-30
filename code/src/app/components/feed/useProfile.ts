"use client";

import { useEffect, useState } from "react";
import { API_PATHS } from "../../constants/api";
import { getAccessToken } from "../../ops/lib/auth";

export interface Profile {
  username?: string;
  picture?: string;
  /** "USER" | "ADMIN" */
  userRole?: string;
  /** The viewer's resolved home hashtag (requires lat/lng; otherwise the backend default). */
  hashtag?: string;
}

interface ProfileState {
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
}

/** Map the snake_case API user object to our Profile (JSON is snake_case globally). */
function toProfile(user: Record<string, unknown> | null | undefined): Profile | null {
  if (!user) return null;
  return {
    username: user.username as string | undefined,
    picture: user.picture as string | undefined,
    userRole: user.user_role as string | undefined,
    hashtag: user.hashtag as string | undefined,
  };
}

/**
 * Loads the signed-in user's profile (role + home hashtag) from /account/profile. Passes the
 * browser's location when available so the backend can resolve the real home hashtag (without
 * coords it returns a default). Returns nulls when logged out.
 */
export function useProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();

    const load = (lat?: number, lng?: number) =>
      fetch(API_PATHS.profile(lat, lng), {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((body) => {
          const p = toProfile(body?.data?.user);
          // Don't clobber an already-loaded profile's hashtag with a coord-less default.
          setProfile((prev) =>
            prev && p && !p.hashtag ? { ...p, hashtag: prev.hashtag } : p,
          );
        })
        .catch(() => {
          /* bad token / unreachable — leave profile null (widget shows Sign in) */
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });

    // Load name/pic/role immediately (never gated on location). Then upgrade the home hashtag
    // once geolocation resolves — so the widget shows the user right away regardless of the
    // location permission prompt.
    load();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => {
          /* permission denied / unavailable — keep the coord-less profile */
        },
        { timeout: 10000, maximumAge: 300000 },
      );
    }
    return () => controller.abort();
  }, []);

  return {
    profile,
    isAdmin: (profile?.userRole ?? "").toUpperCase() === "ADMIN",
    loading,
  };
}
