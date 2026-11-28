"use client";

// The AI connection every AI feature uses (quizzes, bulletin texts, feed moderation): a name the admin chooses plus an OpenAI-compatible endpoint,
// a model and an API key, changed at runtime. Talks to the backend /admin/ai-provider API (ADMIN
// only, enforced by the backend). The saved key is never sent back; the page only shows whether
// one is set and its last 4 characters.

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import {
  AiConnectionTestResult,
  AiProviderConfig,
  AiProviderConfigRequest,
  ENDPOINT_EXAMPLES,
} from "../lib/aiProviderTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Reads the backend's { data } envelope, or throws with the server's message. */
async function readData<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 403) throw new Error("Only administrators can manage the AI connection.");
    const detail = body?.error?.errors?.[0]?.message;
    throw new Error(detail ?? body?.error?.message ?? body?.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** scheme://host:port of a URL (same rule as the backend), or null if it is not a URL. */
function originOf(url: string): string | null {
  try {
    const u = new URL(url);
    const port = u.port || (u.protocol === "https:" ? "443" : "80");
    return `${u.protocol}//${u.hostname.toLowerCase()}:${port}`;
  } catch {
    return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

export default function AiProviderPage() {
  const [config, setConfig] = useState<AiProviderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [testResult, setTestResult] = useState<AiConnectionTestResult | null>(null);

  /** Puts the saved values (never the key) into the form. */
  const fillForm = useCallback((data: AiProviderConfig) => {
    setConfig(data);
    setName(data.name ?? "");
    setEndpoint(data.endpoint ?? "");
    setModel(data.model ?? "");
    setApiKey("");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      fillForm(await readData<AiProviderConfig>(await adminFetch(ADMIN_API.aiProvider)));
    } catch (e) {
      setLoadError(errorText(e, "Could not load the AI connection settings"));
    } finally {
      setLoading(false);
    }
  }, [fillForm]);

  useEffect(() => {
    load();
  }, [load]);

  const saved = config?.source === "DATABASE";
  const busy = saving || testing || resetting;
  // The backend only sends the saved key to the server it was saved for, so a new host needs the
  // key typed again. Mirrored here so the form says so before the request is made.
  const hostChanged =
    saved &&
    !!config?.endpoint &&
    endpoint.trim() !== "" &&
    originOf(endpoint.trim()) !== originOf(config.endpoint);
  const canKeepKey = saved && !hostChanged;
  const keyTyped = apiKey.trim() !== "";
  /** Save stays disabled until something differs from what is saved. */
  const dirty =
    !saved ||
    name.trim() !== (config?.name ?? "") ||
    endpoint.trim() !== (config?.endpoint ?? "") ||
    model.trim() !== (config?.model ?? "") ||
    keyTyped;

  function requestBody(): AiProviderConfigRequest {
    return {
      name: name.trim(),
      endpoint: endpoint.trim(),
      model: model.trim(),
      api_key: apiKey.trim(),
    };
  }

  /** Fills the endpoint from a suggestion, and the name too if it is still empty. */
  function applyExample(label: string, url: string) {
    setEndpoint(url);
    if (!name.trim()) setName(label);
    setTestResult(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Enter a name for this connection.");
      return;
    }
    if (!endpoint.trim()) {
      toast.error("Enter the API endpoint.");
      return;
    }
    if (!model.trim()) {
      toast.error("Enter a model name.");
      return;
    }
    if (!canKeepKey && !keyTyped) {
      toast.error(
        hostChanged
          ? "Enter the API key again to use a different endpoint host."
          : "Enter the API key.",
      );
      return;
    }
    setSaving(true);
    try {
      const data = await readData<AiProviderConfig>(
        await adminFetch(ADMIN_API.aiProvider, {
          method: "PUT",
          headers: JSON_HEADERS,
          body: JSON.stringify(requestBody()),
        }),
      );
      fillForm(data);
      setTestResult(null);
      toast.success("Saved. All AI features use this connection from the next call.");
    } catch (err) {
      toast.error(errorText(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(
        await readData<AiConnectionTestResult>(
          await adminFetch(ADMIN_API.aiProviderTest, {
            method: "POST",
            headers: JSON_HEADERS,
            body: JSON.stringify(requestBody()),
          }),
        ),
      );
    } catch (err) {
      toast.error(errorText(err, "Test failed"));
    } finally {
      setTesting(false);
    }
  }

  async function handleReset() {
    if (
      !window.confirm(
        "Remove the saved connection and key? All AI goes back to the deprecated .env settings.",
      )
    ) {
      return;
    }
    setResetting(true);
    try {
      fillForm(
        await readData<AiProviderConfig>(
          await adminFetch(ADMIN_API.aiProvider, { method: "DELETE" }),
        ),
      );
      setTestResult(null);
      toast.success("Removed. AI uses the deprecated .env settings.");
    } catch (err) {
      toast.error(errorText(err, "Could not remove"));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-200">AI provider</h1>
        <button
          onClick={load}
          disabled={loading || busy}
          aria-label="Reload"
          className="text-zinc-500 hover:text-zinc-300 transition"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>
      <p className="text-sm text-zinc-400">
        The AI used for quizzes, bulletin texts and feed moderation: any OpenAI-compatible
        endpoint, which covers Claude, ChatGPT, Gemini and most others. Changes apply from the
        next AI call; no restart needed.
      </p>

      {loading && !config ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : loadError ? (
        <div className="bg-red-950/40 border border-red-900 text-red-300 text-sm rounded-xl p-4">
          {loadError}
        </div>
      ) : config ? (
        <>
          {/* Where the current settings come from */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm space-y-1">
            {saved ? (
              <>
                <p className="text-zinc-200">
                  Using <span className="font-medium">{config.name}</span> /{" "}
                  <span className="font-medium">{config.model}</span>, saved here.
                </p>
                <p className="text-xs text-zinc-500">
                  Last changed {formatDate(config.updated_at)}
                  {config.updated_by_name || config.updated_by
                    ? ` by ${config.updated_by_name ?? `user #${config.updated_by}`}`
                    : ""}
                </p>
              </>
            ) : (
              <>
                <p className="text-zinc-200">
                  Nothing saved here: using the deprecated .env settings. Save a provider here.
                </p>
                <p className="text-xs text-zinc-500">
                  {config.env_chain.length > 0
                    ? `Tried in order: ${config.env_chain.join(" → ")}`
                    : "No provider is configured in .env either, so quizzes can't be generated, bulletins use the plain weather line and posts go to human review."}
                </p>
              </>
            )}
          </div>

          {!config.encryption_configured && (
            <div className="flex gap-2 bg-amber-950/40 border border-amber-900 text-amber-300 text-sm rounded-xl p-4">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                The server has no AI_CONFIG_ENCRYPTION_KEY, so a new API key cannot be saved. Ask a
                developer to set it.
              </span>
            </div>
          )}

          <form
            onSubmit={handleSave}
            className="space-y-4 bg-zinc-900 border border-zinc-800 rounded-xl p-5"
            autoComplete="off"
          >
            <div>
              <label htmlFor="ai-name" className="text-xs text-zinc-400 mb-1 block">
                Name *
              </label>
              <Input
                id="ai-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Claude"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Your own label for this connection. It&apos;s recorded on each quiz and moderation verdict it writes.
              </p>
            </div>

            <div>
              <label htmlFor="ai-endpoint" className="text-xs text-zinc-400 mb-1 block">
                Endpoint *
              </label>
              <Input
                id="ai-endpoint"
                type="url"
                required
                value={endpoint}
                onChange={(e) => {
                  setEndpoint(e.target.value);
                  setTestResult(null);
                }}
                placeholder="e.g. https://api.anthropic.com/v1"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
              <p className="text-xs text-zinc-500 mt-1">
                The OpenAI-compatible base URL (…/v1) or full …/chat/completions URL. Must be https
                and publicly reachable.
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-xs text-zinc-500">Use:</span>
                {ENDPOINT_EXAMPLES.map((ex) => (
                  <button
                    key={ex.url}
                    type="button"
                    onClick={() => applyExample(ex.label, ex.url)}
                    title={ex.url}
                    className={`text-xs px-2 py-0.5 rounded-md border transition ${
                      endpoint.trim() === ex.url
                        ? "border-emerald-700 bg-emerald-950/40 text-emerald-300"
                        : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="ai-model" className="text-xs text-zinc-400 mb-1 block">
                Model *
              </label>
              <Input
                id="ai-model"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. claude-sonnet-5-5"
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
            </div>

            <div>
              <label htmlFor="ai-key" className="text-xs text-zinc-400 mb-1 block">
                API key {canKeepKey ? "" : "*"}
              </label>
              {/* Write-only: the saved key never comes back from the server, so this field only
                  ever holds what is typed now, and it is cleared after every save. */}
              <Input
                id="ai-key"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  canKeepKey && config.has_key
                    ? `Saved (…${config.key_last4 ?? "****"}), type to replace`
                    : "Paste the API key"
                }
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
              <p className="text-xs mt-1 text-zinc-500 flex flex-wrap items-center gap-x-1">
                {hostChanged ? (
                  <span className="text-amber-400">
                    New endpoint host: enter the key again. The saved key is only sent to{" "}
                    {originOf(config.endpoint ?? "")?.replace(/:443$/, "")}.
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    {saved && <KeyRound className="w-3 h-3" />}
                    Stored encrypted; never shown again.
                  </span>
                )}
                {saved && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={busy}
                    className="underline underline-offset-2 text-zinc-400 hover:text-red-400 disabled:opacity-40"
                  >
                    {resetting ? "Removing…" : "Remove key"}
                  </button>
                )}
              </p>
            </div>

            {testResult && (
              <div
                className={`flex gap-2 text-sm rounded-lg p-3 border ${
                  testResult.success
                    ? "bg-emerald-950/40 border-emerald-900 text-emerald-300"
                    : "bg-red-950/40 border-red-900 text-red-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                )}
                <span className="break-words min-w-0">
                  {testResult.message}
                  <span className="text-xs opacity-70"> ({testResult.latency_ms} ms)</span>
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="submit"
                disabled={busy || !dirty}
                title={dirty ? undefined : "Nothing to save"}
                className="bg-emerald-700 hover:bg-emerald-600 text-white disabled:opacity-40"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={busy}
                className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
              >
                {testing && <Loader2 className="w-4 h-4 animate-spin" />}
                Test
              </Button>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
