"use client";

// AI provider for quiz generation: provider, endpoint, model and API key, changed at runtime.
// Talks to the backend /admin/ai-provider API (ADMIN only, enforced by the backend). The saved key
// is never sent back; the page only shows whether one is set and its last 4 characters.

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminFetch } from "../lib/api";
import { ADMIN_API } from "../lib/constants";
import {
  AiConnectionTestResult,
  AiProviderConfig,
  AiProviderConfigRequest,
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
    if (res.status === 403) throw new Error("Only administrators can manage the AI provider.");
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

  const [provider, setProvider] = useState("");
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
    setProvider(data.provider ?? data.available_providers[0]?.name ?? "");
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
      setLoadError(errorText(e, "Could not load the AI provider settings"));
    } finally {
      setLoading(false);
    }
  }, [fillForm]);

  useEffect(() => {
    load();
  }, [load]);

  const saved = config?.source === "DATABASE";
  const providerChanged = saved && provider !== config?.provider;
  const selected = config?.available_providers.find((p) => p.name === provider);
  const busy = saving || testing || resetting;
  /** Providers with no default (openai-compatible) need the endpoint entered. */
  const endpointRequired = !!selected && !selected.default_endpoint;
  // The backend only sends the saved key to the server it was saved for, so a new host needs the
  // key typed again. Mirrored here so the form says so before the request is made.
  const effectiveEndpoint = endpoint.trim() || selected?.default_endpoint || "";
  const hostChanged =
    saved &&
    !providerChanged &&
    !!config?.endpoint &&
    originOf(effectiveEndpoint) !== originOf(config.endpoint);
  const canKeepKey = saved && !providerChanged && !hostChanged;
  const keyTyped = apiKey.trim() !== "";
  /** Save stays disabled until something differs from what is saved. */
  const dirty =
    !saved ||
    provider !== config?.provider ||
    endpoint.trim() !== (config?.endpoint ?? "") ||
    model.trim() !== (config?.model ?? "") ||
    keyTyped;

  function requestBody(): AiProviderConfigRequest {
    return { provider, endpoint: endpoint.trim(), model: model.trim(), api_key: apiKey.trim() };
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (endpointRequired && !endpoint.trim()) {
      toast.error("Enter the API endpoint for this provider.");
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
          : providerChanged
            ? "Enter the API key for the new provider."
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
      toast.success("Saved. The next quiz generation uses this provider.");
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
        "Remove the saved key and provider? Quiz generation goes back to the .env settings.",
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
      toast.success("Reset. Quiz generation uses the .env settings.");
    } catch (err) {
      toast.error(errorText(err, "Could not reset"));
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
        The provider, model and key used to generate quizzes. Changes apply to the next quiz
        generation; no restart needed.
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
                  Using <span className="font-medium">{config.provider}</span> /{" "}
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
                <p className="text-zinc-200">Nothing saved here: using the .env settings.</p>
                <p className="text-xs text-zinc-500">
                  {config.env_chain.length > 0
                    ? `Tried in order: ${config.env_chain.join(" → ")}`
                    : "No provider is configured in .env either, so quiz generation cannot run."}
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
              <label htmlFor="ai-provider" className="text-xs text-zinc-400 mb-1 block">
                Provider *
              </label>
              <select
                id="ai-provider"
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  // The saved endpoint belongs to the saved provider; use the new one's default.
                  setEndpoint(e.target.value === config.provider ? (config.endpoint ?? "") : "");
                  setTestResult(null);
                }}
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-200"
              >
                {config.available_providers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ai-endpoint" className="text-xs text-zinc-400 mb-1 block">
                API endpoint {endpointRequired ? "*" : ""}
              </label>
              <Input
                id="ai-endpoint"
                type="url"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                required={endpointRequired}
                placeholder={selected?.default_endpoint ?? "e.g. https://openrouter.ai/api/v1"}
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
              />
              <p className="text-xs text-zinc-500 mt-1">
                {endpointRequired
                  ? "The server's OpenAI-style base URL (…/v1) or full …/chat/completions URL. Must be https and publicly reachable."
                  : "Leave blank for the provider's default. Must be https and publicly reachable."}
              </p>
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
                placeholder={
                  provider === "openai"
                    ? "e.g. gpt-5"
                    : endpointRequired
                      ? "e.g. deepseek/deepseek-r1"
                      : "e.g. claude-sonnet-5-5"
                }
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
                ) : providerChanged ? (
                  <span className="text-amber-400">
                    The saved key belongs to {config.provider}; enter a key for this provider.
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
                <span className="break-words">
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
