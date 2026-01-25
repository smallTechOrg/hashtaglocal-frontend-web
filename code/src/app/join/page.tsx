"use client";
import React, { useEffect } from "react";

export default function Join() {
  useEffect(() => {
    // Define the redirect function globally
    (window as any).redirectToThankYou = function() {
      window.location.href = "/";
    };

    // Load Typeform embed script
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    // Cleanup
    return () => {
      delete (window as any).redirectToThankYou;
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <h1 style={{ 
        fontSize: "2rem", 
        fontWeight: "500", 
        marginBottom: "2rem",
        textAlign: "center"
      }}>
        Join The Movement
      </h1>
      <div 
        data-tf-widget="OI3uc4p3" 
        data-tf-on-submit="redirectToThankYou"
        style={{ width: "100%", maxWidth: "800px", height: "600px" }}
      ></div>
    </div>
  );
}
