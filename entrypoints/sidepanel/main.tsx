import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSession, saveSession } from '../../sidepanel-lib/sessions';
import { CHAT_PORT_NAME, type BusMessage, type ChatPortEvent } from '../../shared/messages';
import { buildDiscussionMessages, buildTranslationMessages } from '../../shared/prompts';
import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  loadSettings,
  type StorageLike,
} from '../../shared/settings';
import type {
  ChatMessage,
  DisplayMessage,
  DisplayMessageErrorKind,
  ModelRef,
  ProviderConfig,
  Settings,
  TranslatePayload,
} from '../../shared/types';
import './style.css';

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [paperUrl, setPaperUrl] = useState('');
  const [paperTitle, setPaperTitle] = useState('Ask AI');
  const [fullText, setFullText] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState<ModelRef>(DEFAULT_SETTINGS.defaultModel);
  const messagesRef = useRef<DisplayMessage[]>([]);
  // 事件监听只在挂载时注册一次，回调一律通过 ref 读取最新值，
  // 避免 effect 因 settings/model 变化重跑（重跑会触发 restoreActiveTab 清空对话）。
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const modelRef = useRef<ModelRef>(DEFAULT_SETTINGS.defaultModel);
  const paperUrlRef = useRef('');
  const paperTitleRef = useRef('Ask AI');

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  useEffect(() => {
    void (async () => {
      const loaded = await loadSettings(chromeStorage);
      setSettings(loaded);
      setModel(loaded.defaultModel);
      modelRef.current = loaded.defaultModel;
      await restoreActiveTab();
      const payload = (await chrome.runtime.sendMessage({
        type: 'GET_PENDING_TRANSLATE',
      } satisfies BusMessage)) as TranslatePayload | null;
      if (payload) {
        void startTranslation(payload);
      }
    })();

    function handleMessage(message: BusMessage) {
      if (message.type === 'TRANSLATE_PUSH') {
        void startTranslation(message.payload);
      }
    }
    // 设置页保存后实时跟进新设置；不重置 model，保留用户在会话里的选择
    function handleStorageChanged(
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) {
      if (area !== 'local' || !changes[SETTINGS_STORAGE_KEY]) {
        return;
      }
      void loadSettings(chromeStorage).then(setSettings);
    }
    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.tabs.onActivated.addListener(handleActivated);
    chrome.storage.onChanged.addListener(handleStorageChanged);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.tabs.onActivated.removeListener(handleActivated);
      chrome.storage.onChanged.removeListener(handleStorageChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledProviders = useMemo(
    () => settings.providers.filter((provider) => provider.apiKey.trim().length > 0),
    [settings.providers],
  );

  async function handleActivated(activeInfo: { tabId: number }) {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await loadSessionForUrl(tab.url, tab.title ?? tab.url);
    }
  }

  async function restoreActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      await loadSessionForUrl(tab.url, tab.title ?? tab.url);
    }
  }

  // 标签页 URL 可能是扩展阅读器地址（viewer.html?file=...），会话以论文原始 URL 为键，
  // 必须先还原，否则查不到论文上下文和历史会话。
  function normalizePaperUrl(url: string): string {
    if (url.startsWith(chrome.runtime.getURL('/viewer.html'))) {
      const file = new URL(url).searchParams.get('file');
      if (file) {
        return file;
      }
    }
    return url;
  }

  async function loadSessionForUrl(url: string, title: string) {
    const normalizedUrl = normalizePaperUrl(url);
    const paper = await chrome.runtime.sendMessage({
      type: 'GET_PAPER',
      url: normalizedUrl,
    } satisfies BusMessage);
    const resolvedUrl = paper?.url ?? normalizedUrl;
    const resolvedTitle = paper?.title ?? title;
    paperUrlRef.current = resolvedUrl;
    paperTitleRef.current = resolvedTitle;
    setPaperUrl(resolvedUrl);
    setPaperTitle(resolvedTitle);
    setFullText(paper?.fullText ?? '');

    const session = await getSession(resolvedUrl);
    if (session) {
      setMessages(session.messages);
      setModel(session.model);
      modelRef.current = session.model;
    } else {
      setMessages([]);
    }
  }

  async function startTranslation(payload: TranslatePayload) {
    // ref 必须同步更新：persist 在同一个 tick 里就会用到，等 state 生效就晚了
    paperUrlRef.current = payload.paperUrl;
    paperTitleRef.current = payload.paperTitle;
    setPaperUrl(payload.paperUrl);
    setPaperTitle(payload.paperTitle);
    const id = crypto.randomUUID();
    const draft: DisplayMessage = {
      id,
      role: 'assistant',
      content: '',
      kind: 'translation',
      sourceText: payload.text,
      status: 'streaming',
    };
    appendMessage(draft);
    await streamAssistant({
      id,
      messages: buildTranslationMessages({
        paperTitle: payload.paperTitle,
        context: payload.context,
        text: payload.text,
        targetLang: settingsRef.current.targetLang,
      }),
      sessionUrl: payload.paperUrl,
    });
  }

  async function sendChat() {
    const question = input.trim();
    if (!question) {
      return;
    }
    setInput('');
    const userMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      kind: 'chat',
      status: 'done',
    };
    const assistantId = crypto.randomUUID();
    appendMessage(userMessage);
    appendMessage({
      id: assistantId,
      role: 'assistant',
      content: '',
      kind: 'chat',
      status: 'streaming',
    });
    await streamAssistant({
      id: assistantId,
      sessionUrl: paperUrl || location.href,
      messages: buildDiscussionMessages({
        paperTitle,
        fullText,
        history: toChatHistory(messagesRef.current),
        question,
      }),
    });
  }

  async function streamAssistant(request: {
    id: string;
    sessionUrl: string;
    messages: ChatMessage[];
  }) {
    const port = chrome.runtime.connect({ name: CHAT_PORT_NAME });
    let partial = '';

    port.onMessage.addListener((event: ChatPortEvent) => {
      if (event.type === 'delta') {
        partial += event.text;
        updateMessage(request.id, { content: partial, status: 'streaming' });
      } else if (event.type === 'done') {
        updateMessage(request.id, { content: event.full, status: 'done' });
        port.disconnect();
      } else {
        updateMessage(request.id, {
          content: partial || event.message,
          status: partial ? 'interrupted' : 'error',
          errorKind: classifyError(event.status),
        });
      }
    });

    port.postMessage({
      sessionUrl: request.sessionUrl,
      model: modelRef.current,
      messages: request.messages,
    });
  }

  function appendMessage(message: DisplayMessage) {
    setMessages((current) => {
      const next = [...current, message];
      void persist(next);
      return next;
    });
  }

  function updateMessage(id: string, patch: Partial<DisplayMessage>) {
    setMessages((current) => {
      const next = current.map((message) => (message.id === id ? { ...message, ...patch } : message));
      void persist(next);
      return next;
    });
  }

  async function persist(next: DisplayMessage[]) {
    const url = paperUrlRef.current || location.href;
    await saveSession({
      url,
      title: paperTitleRef.current,
      model: modelRef.current,
      messages: next,
      updatedAt: Date.now(),
    });
  }

  function selectModel(value: string) {
    const [providerId, selectedModel] = value.split('::');
    if (providerId && selectedModel) {
      const next: ModelRef = { providerId: providerId as ModelRef['providerId'], model: selectedModel };
      modelRef.current = next;
      setModel(next);
      // 把模型选择记进当前论文的会话，下次恢复时沿用
      if (messagesRef.current.length > 0) {
        void persist(messagesRef.current);
      }
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <h1>{paperTitle}</h1>
          <span>{paperUrl || 'No paper loaded'}</span>
        </div>
        <select value={`${model.providerId}::${model.model}`} onChange={(event) => selectModel(event.target.value)}>
          {enabledProviders.length === 0 && <option>No configured model</option>}
          {enabledProviders.flatMap((provider) =>
            provider.models.map((item) => (
              <option key={`${provider.id}::${item}`} value={`${provider.id}::${item}`}>
                {provider.name} · {item}
              </option>
            )),
          )}
        </select>
      </header>

      <section className="messages">
        {messages.length === 0 && <div className="empty">Open a paper or select text to begin.</div>}
        {messages.map((message) => (
          <article key={message.id} className={`message ${message.kind} ${message.role}`}>
            {message.sourceText && <blockquote>{message.sourceText}</blockquote>}
            <p>{message.content || (message.status === 'streaming' ? '...' : '')}</p>
            {message.status !== 'done' && message.status !== 'streaming' && (
              <footer>
                <span>{message.status}</span>
                {message.errorKind === 'auth' && (
                  <button type="button" onClick={() => chrome.runtime.openOptionsPage()}>
                    Settings
                  </button>
                )}
              </footer>
            )}
          </article>
        ))}
      </section>

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          void sendChat();
        }}
      >
        <div className="composer-box">
          <textarea
            value={input}
            rows={1}
            placeholder="对这篇论文提问…（Enter 发送，Shift+Enter 换行）"
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={(event) => {
              // isComposing：中文输入法选词回车不能触发发送
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void sendChat();
              }
            }}
          />
          <button type="submit" disabled={!input.trim()} aria-label="发送">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M2.5 17.5l15-7.5-15-7.5v5.83L13.33 10 2.5 11.67z" />
            </svg>
          </button>
        </div>
      </form>
    </main>
  );
}

function toChatHistory(messages: DisplayMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message.status === 'done')
    .map((message) => ({ role: message.role, content: message.content }));
}

function classifyError(status?: number): DisplayMessageErrorKind {
  if (status === 401 || status === 403) {
    return 'auth';
  }
  if (status === 408 || status === 429 || (status !== undefined && status >= 500)) {
    return 'retryable';
  }
  return 'other';
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

createRoot(document.getElementById('root')!).render(<App />);
