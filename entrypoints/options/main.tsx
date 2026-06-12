import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadSettings, saveSettings, type StorageLike } from '../../shared/settings';
import type { ModelRef, ProviderConfig, Settings } from '../../shared/types';
import './style.css';

function OptionsApp() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    void loadSettings(chromeStorage).then(setSettings);
  }, []);

  const modelOptions = useMemo(
    () =>
      settings?.providers.flatMap((provider) =>
        provider.models.map((model) => ({
          value: `${provider.id}::${model}`,
          label: `${provider.name} · ${model}`,
        })),
      ) ?? [],
    [settings],
  );

  if (!settings) {
    return <main className="options">Loading...</main>;
  }

  function updateProvider(id: string, patch: Partial<ProviderConfig>) {
    setSettings((current) =>
      current
        ? {
            ...current,
            providers: current.providers.map((provider) =>
              provider.id === id ? { ...provider, ...patch } : provider,
            ),
          }
        : current,
    );
    setSaved(false);
  }

  function addCustomProvider() {
    const provider: ProviderConfig = {
      id: `custom-${crypto.randomUUID()}`,
      name: 'Custom endpoint',
      kind: 'openai-compat',
      baseUrl: 'https://example.com/v1',
      apiKey: '',
      models: ['custom-model'],
    };
    setSettings((current) =>
      current
        ? {
            ...current,
            providers: [...current.providers, provider],
          }
        : current,
    );
    setSaved(false);
  }

  function removeProvider(id: string) {
    setSettings((current) =>
      current
        ? {
            ...current,
            providers: current.providers.filter((provider) => provider.id !== id),
          }
        : current,
    );
    setSaved(false);
  }

  function selectDefault(value: string) {
    const [providerId, model] = value.split('::');
    if (!providerId || !model) {
      return;
    }
    setSettings((current) =>
      current
        ? {
            ...current,
            defaultModel: { providerId: providerId as ModelRef['providerId'], model },
          }
        : current,
    );
    setSaved(false);
  }

  async function persist() {
    if (!settings) {
      return;
    }
    try {
      await saveSettings(chromeStorage, settings);
      setSaved(true);
      setSaveError('');
    } catch (error) {
      setSaved(false);
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main className="options">
      <header className="header">
        <div>
          <h1>英文论文阅读助手 · 设置</h1>
          <p>API keys stay in chrome.storage.local.</p>
        </div>
        <div className="save-area">
          <button type="button" onClick={() => void persist()}>
            Save
          </button>
          {saved && <span className="save-ok">已保存 ✓</span>}
          {saveError && <span className="save-error">保存失败: {saveError}</span>}
        </div>
      </header>

      <section className="panel">
        <label>
          Target language
          <input
            value={settings.targetLang}
            onChange={(event) => {
              setSettings({ ...settings, targetLang: event.target.value });
              setSaved(false);
            }}
          />
        </label>
        <label>
          Default model
          <select
            value={`${settings.defaultModel.providerId}::${settings.defaultModel.model}`}
            onChange={(event) => selectDefault(event.target.value)}
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="providers">
        {settings.providers.map((provider) => (
          <article key={provider.id} className="provider">
            <div className="provider-title">
              <input
                value={provider.name}
                onChange={(event) => updateProvider(provider.id, { name: event.target.value })}
                disabled={!provider.id.startsWith('custom-')}
              />
              {provider.id.startsWith('custom-') && (
                <button type="button" onClick={() => removeProvider(provider.id)}>
                  Remove
                </button>
              )}
            </div>
            <label>
              API key
              <input
                type="password"
                value={provider.apiKey}
                onChange={(event) => updateProvider(provider.id, { apiKey: event.target.value })}
              />
            </label>
            <label>
              Base URL
              <input
                value={provider.baseUrl}
                onChange={(event) => updateProvider(provider.id, { baseUrl: event.target.value })}
                disabled={!provider.id.startsWith('custom-')}
              />
            </label>
            <label>
              Models
              <input
                value={provider.models.join(', ')}
                onChange={(event) =>
                  updateProvider(provider.id, {
                    models: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          </article>
        ))}
      </section>

      <footer className="footer">
        <button type="button" onClick={addCustomProvider}>
          Add custom endpoint
        </button>
        {saved && <span>Saved</span>}
      </footer>
    </main>
  );
}

const chromeStorage: StorageLike = {
  async get<T>(key: string): Promise<T | undefined> {
    const value = await chrome.storage.local.get(key);
    return value[key] as T | undefined;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await chrome.storage.local.set({ [key]: value });
  },
};

createRoot(document.getElementById('root')!).render(<OptionsApp />);
