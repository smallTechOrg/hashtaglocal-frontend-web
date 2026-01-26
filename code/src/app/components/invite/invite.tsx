"use client";
import React from "react";
import Link from "next/link";
import "./invite.css";
import { useClickTracking } from "../../hooks/useClickTracking";
import { EventCategory } from "../../utils/analytics";

export default function Invite() {
  const trackClick = useClickTracking();

  return (
    <section className="invite-container">
      <div className="invite-content">
        <h3 className="font-[500] mb-2">
          Tired of complaining? Start Contributing.
        </h3>
        <Link href="/join">
          <button 
            className="invite-button"
            onClick={() => trackClick('Join The Movement', EventCategory.ENGAGEMENT, { source: 'invite_section' })}
          >
            Join The Movement
          </button>
        </Link>
      </div>
    </section>
  );
}
