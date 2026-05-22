"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useClickTracking } from "../../hooks/useClickTracking";
import { EventCategory } from "../../utils/analytics";
import GetAppModal from "./GetAppModal";

export default function Header() {
  const trackClick = useClickTracking();
  const [appModalOpen, setAppModalOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <Link
          href="/"
          className="site-brand"
          onClick={() =>
            trackClick("Logo Click - Home", EventCategory.NAVIGATION)
          }
        >
          <Image
            src="/logo-green.png"
            alt="#local"
            width={34}
            height={34}
            priority
          />
          <span className="site-brand-text">
            <span className="site-brand-name">#local</span>
            <span className="site-brand-tag">
              a location based community platform
            </span>
          </span>
        </Link>

        <nav className="site-nav">
          <button
            type="button"
            className="site-nav-cta"
            onClick={() => {
              trackClick("Get the app", EventCategory.ENGAGEMENT, {
                source: "header",
              });
              setAppModalOpen(true);
            }}
          >
            Get the app
          </button>
        </nav>
      </header>

      <GetAppModal
        open={appModalOpen}
        onClose={() => setAppModalOpen(false)}
      />
    </>
  );
}
