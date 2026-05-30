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
  const { profile, isAdmin } = useProfile();
  const loggedIn = typeof window !== "undefined" && isAuthenticated();

  function signIn() {
    sessionStorage.setItem(
      "report_issue_return_to",
      window.location.pathname + window.location.search,
    );
    window.location.href = buildGoogleAuthUrl(
      GOOGLE_CLIENT_ID,
      `${window.location.origin}/auth/callback`,
    );
  }

  function logout() {
    clearTokens();
    window.location.reload();
  }

  if (!loggedIn) {
    return (
      <button className="xp-auth xp-auth-signin" onClick={signIn}>
        Sign in
      </button>
    );
  }

  return (
    <div className="xp-auth">
      {profile?.picture && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.picture} alt="" className="xp-auth-avatar" />
      )}
      <span className="xp-auth-info">
        <span className="xp-auth-name">
          {profile?.username ?? "You"}
          {isAdmin && <span className="xp-auth-badge">admin</span>}
        </span>
        <span className="xp-auth-loc">
          <MapPin className="xp-auth-loc-icon" />
          {profile?.hashtag ? profile.hashtag : "location on"}
        </span>
      </span>
      <button className="xp-auth-logout" onClick={logout} title="Log out" aria-label="Log out">
        <LogOut className="xp-auth-loc-icon" />
      </button>
    </div>
  );
}
