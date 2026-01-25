"use client";
import React from "react";
import Link from "next/link";
import "./invite.css";

export default function Invite() {
  return (
    <section className="invite-container">
      <div className="invite-content">
        <h3 className="font-[500] mb-2">
          Tired of complaining? Start Contributing.
        </h3>
        <Link href="/join">
          <button className="invite-button">Join The Movement</button>
        </Link>
      </div>
    </section>
  );
}
