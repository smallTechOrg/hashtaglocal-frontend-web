"use client";

import { useEffect, useState } from "react";
import { API_PATHS } from "../../constants/api";
import { getAccessToken } from "../../ops/lib/auth";

export interface Profile {
  username?: string;
  picture?: string;
  /** "USER" | "ADMIN" */
  userRole?: string;
  /** The viewer's resolved home hashtag, if any. */
  hashtag?: string;
}

interface ProfileState {
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Loads the signed-in user's profile (role + home hashtag) from /account/profile. Returns nulls
 * when logged out. Used so the chat composer can let admins post to any hashtag without geolocation.
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
    fetch(API_PATHS.profile, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((body) => setProfile(body?.data?.user ?? null))
      .catch(() => {
        /* logged out / unreachable — treat as no profile */
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return {
    profile,
    isAdmin: (profile?.userRole ?? "").toUpperCase() === "ADMIN",
    loading,
  };
}
