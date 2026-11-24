// Types for the /admin/ai-provider API. The API key is write-only: responses carry only
// has_key and key_last4, never the key.

export interface AiProviderOption {
  name: string;
  display_name: string;
  /** null when the provider has no default (openai-compatible): the endpoint must be entered. */
  default_endpoint: string | null;
}

export interface AiProviderConfig {
  /** DATABASE: saved from this page. ENV: nothing saved, quiz generation uses the .env chain. */
  source: "DATABASE" | "ENV";
  provider: string | null;
  endpoint: string | null;
  model: string | null;
  has_key: boolean;
  key_last4: string | null;
  updated_at: string | null;
  updated_by: number | null;
  updated_by_name: string | null;
  encryption_configured: boolean;
  env_chain: string[];
  available_providers: AiProviderOption[];
}

export interface AiProviderConfigRequest {
  provider: string;
  endpoint: string;
  model: string;
  /** Blank keeps the saved key. */
  api_key: string;
}

export interface AiConnectionTestResult {
  success: boolean;
  provider: string;
  endpoint: string;
  model: string;
  latency_ms: number;
  message: string;
}
