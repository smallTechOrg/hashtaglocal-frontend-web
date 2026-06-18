"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface AiPrompt {
  key: string;
  description: string;
  template: string;
}

export default function AiPromptsPage() {
  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await adminFetch(ADMIN_API.aiPrompts);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setPrompts(json.data ?? []);
    } catch (err) {
      toast.error(`Failed to load prompts: ${err}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">AI Prompts</h1>
        <button
          onClick={load}
          disabled={loading}
          className="text-zinc-500 hover:text-zinc-300 transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        prompts.map((prompt) => (
          <div key={prompt.key} className="space-y-2">
            <p className="text-sm font-medium text-zinc-300">{prompt.description}</p>
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed bg-zinc-800 rounded-lg px-4 py-3 border border-zinc-700">
              {prompt.template}
            </pre>
          </div>
        ))
      )}
    </div>
  );
}
