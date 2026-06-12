import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../shared/settings';
import { PROVIDER_PRESETS } from '../shared/presets';
import type { Settings } from '../shared/types';

class MemoryStorage {
  private values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.values.get(key) as T | undefined;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }
}

describe('settings', () => {
  it('returns default settings when storage is empty', async () => {
    const settings = await loadSettings(new MemoryStorage());

    expect(settings.targetLang).toBe('中文');
    expect(settings.providers).toHaveLength(7);
    expect(settings.providers.map((provider) => provider.id)).toEqual(
      PROVIDER_PRESETS.map((provider) => provider.id),
    );
    expect(settings.defaultModel).toEqual({
      providerId: 'deepseek',
      model: 'deepseek-v4-flash',
    });
  });

  it('saves settings and reads them back', async () => {
    const storage = new MemoryStorage();
    const next: Settings = {
      ...DEFAULT_SETTINGS,
      targetLang: 'English',
      providers: DEFAULT_SETTINGS.providers.map((provider) =>
        provider.id === 'openai' ? { ...provider, apiKey: 'sk-test' } : provider,
      ),
      defaultModel: { providerId: 'openai', model: 'gpt-5.5' },
    };

    await saveSettings(storage, next);

    expect(await loadSettings(storage)).toEqual(next);
  });

  it('merges stored settings with new presets and preserves custom providers', async () => {
    const storage = new MemoryStorage();
    const stored: Settings = {
      targetLang: '日本語',
      defaultModel: { providerId: 'custom-local', model: 'local-model' },
      providers: [
        {
          ...PROVIDER_PRESETS[0]!,
          apiKey: 'anthropic-key',
          models: ['claude-3-5-sonnet-latest', 'claude-custom'],
        },
        {
          id: 'custom-local',
          name: 'Local Gateway',
          kind: 'openai-compat',
          baseUrl: 'http://localhost:8787/v1',
          apiKey: 'local-key',
          models: ['local-model'],
        },
      ],
    };

    await saveSettings(storage, stored);
    const settings = await loadSettings(storage);

    expect(settings.targetLang).toBe('日本語');
    expect(settings.defaultModel).toEqual(stored.defaultModel);
    expect(settings.providers).toHaveLength(8);
    // 预设模型升级为最新列表，退役的历史预设模型被剔除，用户自加的模型保留在尾部
    expect(settings.providers.find((provider) => provider.id === 'anthropic')).toMatchObject({
      apiKey: 'anthropic-key',
      models: [...PROVIDER_PRESETS[0]!.models, 'claude-custom'],
    });
    expect(settings.providers.find((provider) => provider.id === 'deepseek')).toBeDefined();
    expect(settings.providers.find((provider) => provider.id === 'custom-local')).toEqual(
      stored.providers[1],
    );
  });
});
