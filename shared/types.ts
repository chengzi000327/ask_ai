export type PresetProviderId =
  | 'anthropic'
  | 'openai'
  | 'deepseek'
  | 'glm'
  | 'kimi'
  | 'qwen'
  | 'minimax';

export type ProviderId = PresetProviderId | `custom-${string}`;

export type ProviderKind = 'anthropic' | 'openai-compat';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKey: string;
  models: string[];
}

export interface ModelRef {
  providerId: ProviderId;
  model: string;
}

export interface Settings {
  providers: ProviderConfig[];
  defaultModel: ModelRef;
  targetLang: string;
}

export interface PaperContext {
  url: string;
  title: string;
  fullText: string;
}

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type DisplayMessageKind = 'chat' | 'translation';
export type DisplayMessageStatus = 'streaming' | 'done' | 'interrupted' | 'error';
export type DisplayMessageErrorKind = 'auth' | 'retryable' | 'other';

export interface DisplayMessage extends ChatMessage {
  id: string;
  kind: DisplayMessageKind;
  status: DisplayMessageStatus;
  sourceText?: string;
  errorKind?: DisplayMessageErrorKind;
}

export interface Session {
  url: string;
  title: string;
  zhTitle?: string;
  messages: DisplayMessage[];
  model: ModelRef;
  updatedAt: number;
}

export interface TranslatePayload {
  text: string;
  context: string;
  paperUrl: string;
  paperTitle: string;
}

export interface ChatOptions {
  config: ProviderConfig;
  model: string;
  messages: ChatMessage[];
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}

export interface Provider {
  chat(opts: ChatOptions): Promise<string>;
}
