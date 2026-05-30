"use client";

import { LogOut, MapPin } from "lucide-react";
import { useProfile } from "../feed/useProfile";
import { clearTokens, isAuthenticated, buildGoogleAuthUrl } from "../../ops/lib/auth";
import { GOOGLE_CLIENT_ID } from "../../ops/lib/constants";

/**
 * Small auth status chip pinned to the map: shows the signed-in user (avatar + name + location
 * status) with a logout button, or a Sign in button when logged out. Lives on the map chrome so
 * login state is always visible regardless of the active tab.
 */
export default function AuthWidget() {
  const { profile, isAdmin, loading } = useProfile();
  const loggedIn = typeof window !== "undefined" && isAuthenticated();

  function signIn() {
    // Map sign-in: return to the map (home). Not the report flow.
    sessionStorage.setItem("auth_return_to", "/");
    window.location.href = buildGoogleAuthUrl(
      GOOGLE_CLIENT_ID,
      `${window.location.origin}/auth/callback`,
    );
  }

  function logout() {
    clearTokens();
    window.location.reload();
  }

  // Not logged in (or the token was rejected and no profile loaded) → Sign in.
  if (!loggedIn || (!loading && !profile)) {
    return (
      <button className="xp-auth xp-auth-signin" onClick={signIn}>
        Sign in
      </button>
    );
  }

  // Logged in but the profile hasn't resolved yet → neutral loading chip (no placeholder garbage).
  if (!profile) {
    return (
      <div className="xp-auth">
        <span className="xp-auth-loading">Signing in…</span>
      </div>
    );
  }

  return (
    <div className="xp-auth">
      {profile.picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.picture}
          alt=""
          className="xp-auth-avatar"
          // Google avatars (lh3.googleusercontent.com) 403 when a referrer is sent.
          referrerPolicy="no-referrer"
        />
      )}
      <span className="xp-auth-info">
        <span className="xp-auth-name">
          {profile.username ?? "Member"}
          {isAdmin && <span className="xp-auth-badge">admin</span>}
        </span>
        {profile.hashtag && (
          <span className="xp-auth-loc">
            <MapPin className="xp-auth-loc-icon" />
            {profile.hashtag}
          </span>
        )}
      </span>
      <button className="xp-auth-logout" onClick={logout} title="Log out" aria-label="Log out">
        <LogOut className="xp-auth-loc-icon" />
      </button>
    </div>
  );
}
