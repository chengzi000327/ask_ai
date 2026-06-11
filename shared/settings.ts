import { PROVIDER_PRESETS } from './presets';
import type { ProviderConfig, ProviderId, Settings } from './types';

export const SETTINGS_STORAGE_KEY = 'ask_ai_settings';

export interface StorageLike {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = {
  providers: cloneProviders(PROVIDER_PRESETS),
  defaultModel: {
    providerId: 'deepseek',
    model: 'deepseek-chat',
  },
  targetLang: '中文',
};

export async function loadSettings(storage: StorageLike): Promise<Settings> {
  const stored = await storage.get<Settings>(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return cloneSettings(DEFAULT_SETTINGS);
  }

  return mergeSettings(stored);
}

export async function saveSettings(storage: StorageLike, settings: Settings): Promise<void> {
  await storage.set(SETTINGS_STORAGE_KEY, cloneSettings(settings));
}

export function mergeSettings(stored: Settings): Settings {
  const storedById = new Map<ProviderId, ProviderConfig>(
    stored.providers.map((provider) => [provider.id, provider]),
  );

  const mergedPresets = PROVIDER_PRESETS.map((preset) => ({
    ...preset,
    ...storedById.get(preset.id),
    id: preset.id,
    kind: storedById.get(preset.id)?.kind ?? preset.kind,
  }));

  const customProviders = stored.providers.filter((provider) => provider.id.startsWith('custom-'));

  return {
    providers: cloneProviders([...mergedPresets, ...customProviders]),
    defaultModel: { ...stored.defaultModel },
    targetLang: stored.targetLang || DEFAULT_SETTINGS.targetLang,
  };
}

function cloneSettings(settings: Settings): Settings {
  return {
    ...settings,
    defaultModel: { ...settings.defaultModel },
    providers: cloneProviders(settings.providers),
  };
}

function cloneProviders(providers: ProviderConfig[]): ProviderConfig[] {
  return providers.map((provider) => ({
    ...provider,
    models: [...provider.models],
  }));
}
