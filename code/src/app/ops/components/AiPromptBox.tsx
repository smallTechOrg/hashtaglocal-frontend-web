"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";

/**
 * Collapsible inline view of a single Groq prompt template.
 * Pass the key ("WEATHER_SUMMARY" or "QUIZ_EXPLANATION") and it fetches + renders the template.
 */
export default function AiPromptBox({ promptKey }: { promptKey: string }) {
  const [template, setTemplate] = useState<string | null>(null);

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
    <details className="mb-5 group">
      <summary className="cursor-pointer text-sm text-zinc-400 hover:text-zinc-200 transition select-none list-none flex items-center gap-1.5">
        <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
        Current AI prompt
      </summary>
      <pre className="mt-2 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed bg-zinc-800 rounded-md px-3 py-2.5 border border-zinc-700">
        {template}
      </pre>
    </details>
  );
}
