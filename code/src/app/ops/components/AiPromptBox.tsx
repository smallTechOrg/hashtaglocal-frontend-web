"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";

/**
 * Collapsible inline view of a single Groq prompt template.
 * Pass the key ("WEATHER_SUMMARY" or "QUIZ_EXPLANATION") and it fetches + renders the template.
 */
export default function AiPromptBox({ promptKey, label }: { promptKey: string; label?: string }) {
  const [template, setTemplate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    adminFetch(ADMIN_API.aiPrompts)
      .then((r) => r.json())
      .then((json) => {
        const match = (json.data ?? []).find(
          (p: { key: string; template: string }) => p.key === promptKey,
        );
        if (match) setTemplate(match.template);
      })
      .catch(() => {});
  }, [promptKey]);

  if (!template) return null;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-zinc-800 transition"
      >
        <span className="text-sm font-medium text-zinc-200">
          {label ?? "AI prompt"}
        </span>
        <span className={`text-zinc-400 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▼</span>
      </button>
      {open && (
        <pre className="px-4 py-3 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed border-t border-zinc-700 bg-zinc-950">
          {template}
        </pre>
      )}
    </div>
  );
}
