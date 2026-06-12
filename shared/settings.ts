import { LEGACY_PRESET_MODELS, PROVIDER_PRESETS } from './presets';
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
    model: 'deepseek-v4-flash',
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

  const mergedPresets = PROVIDER_PRESETS.map((preset) => {
    const storedProvider = storedById.get(preset.id);
    return {
      ...preset,
      ...storedProvider,
      id: preset.id,
      kind: storedProvider?.kind ?? preset.kind,
      models: mergePresetModels(preset.models, storedProvider?.models),
    };
  });

  const customProviders = stored.providers.filter((provider) => provider.id.startsWith('custom-'));
  const providers = [...mergedPresets, ...customProviders];

  return {
    providers: cloneProviders(providers),
    defaultModel: resolveDefaultModel(stored.defaultModel, providers),
    targetLang: stored.targetLang || DEFAULT_SETTINGS.targetLang,
  };
}

// 预设模型名以代码内最新预设为准；用户自行添加的模型保留，历史预设默认值剔除。
function mergePresetModels(presetModels: string[], storedModels: string[] | undefined): string[] {
  const userAdded = (storedModels ?? []).filter(
    (model) => !LEGACY_PRESET_MODELS.has(model) && !presetModels.includes(model),
  );
  return [...presetModels, ...userAdded];
}

function resolveDefaultModel(
  defaultModel: Settings['defaultModel'],
  providers: ProviderConfig[],
): Settings['defaultModel'] {
  const provider = providers.find((candidate) => candidate.id === defaultModel.providerId);
  if (provider?.models.includes(defaultModel.model)) {
    return { ...defaultModel };
  }
  return { ...DEFAULT_SETTINGS.defaultModel };
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
