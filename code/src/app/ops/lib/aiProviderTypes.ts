// Types for the /admin/ai-provider API. A connection is a name the admin chooses plus an
// OpenAI-compatible endpoint, a model and an API key. The key is write-only: responses carry only
// has_key and key_last4, never the key.

export interface AiProviderConfig {
  /** DATABASE: saved from this page. ENV: nothing saved, quiz generation uses the .env chain. */
  source: "DATABASE" | "ENV";
  /** The admin's own name for the connection, e.g. "Claude". */
  name: string | null;
  endpoint: string | null;
  model: string | null;
  has_key: boolean;
  key_last4: string | null;
  updated_at: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  encryption_configured: boolean;
  env_chain: string[];
}

export interface AiProviderConfigRequest {
  name: string;
  endpoint: string;
  model: string;
  /** Blank keeps the saved key (same endpoint host only). */
  api_key: string;
}

export interface AiConnectionTestResult {
  success: boolean;
  name: string | null;
  endpoint: string;
  model: string;
  latency_ms: number;
  message: string;
}

/** OpenAI-compatible base URLs of common providers, offered as endpoint suggestions. */
export const ENDPOINT_EXAMPLES: { label: string; url: string }[] = [
  { label: "Claude", url: "https://api.anthropic.com/v1" },
  { label: "ChatGPT", url: "https://api.openai.com/v1" },
  { label: "Gemini", url: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { label: "OpenRouter", url: "https://openrouter.ai/api/v1" },
];
