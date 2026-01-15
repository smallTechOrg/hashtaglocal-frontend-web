"use client";
import React from "react";
import "./invite.css";

export default function Invite() {
  return (
    <section className="invite-container">
      <div className="invite-content">
        <h3 className="font-[500] mb-2">
          Tired of complaining? Start Contributing.
        </h3>
        <a href="https://form.typeform.com/to/OI3uc4p3">
        <button className="invite-button">Join The Movement</button>
        </a>
      </div>
    </section>
  );
}
