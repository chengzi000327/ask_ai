import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getSession, saveSession } from '../../sidepanel-lib/sessions';
import { CHAT_PORT_NAME, type BusMessage, type ChatPortEvent } from '../../shared/messages';
import { buildDiscussionMessages, buildTranslationMessages } from '../../shared/prompts';
import { DEFAULT_SETTINGS, loadSettings, type StorageLike } from '../../shared/settings';
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

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    void loadSettings(chromeStorage).then((loaded) => {
      setSettings(loaded);
      setModel(loaded.defaultModel);
    });
  }, []);

  useEffect(() => {
    function handleMessage(message: BusMessage) {
      if (message.type === 'TRANSLATE_PUSH') {
        void startTranslation(message.payload);
      }
    }
    chrome.runtime.onMessage.addListener(handleMessage);
    void restoreActiveTab();
    void chrome.runtime.sendMessage({ type: 'GET_PENDING_TRANSLATE' } satisfies BusMessage).then(
      (payload: TranslatePayload | null) => {
        if (payload) {
          void startTranslation(payload);
        }
      },
    );
    chrome.tabs.onActivated.addListener(handleActivated);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      chrome.tabs.onActivated.removeListener(handleActivated);
    };
  }, [settings, model]);

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

  async function loadSessionForUrl(url: string, title: string) {
    const paper = await chrome.runtime.sendMessage({ type: 'GET_PAPER', url } satisfies BusMessage);
    const resolvedTitle = paper?.title ?? title;
    setPaperUrl(paper?.url ?? url);
    setPaperTitle(resolvedTitle);
    setFullText(paper?.fullText ?? '');

    const session = await getSession(paper?.url ?? url);
    if (session) {
      setMessages(session.messages);
      setModel(session.model);
    } else {
      setMessages([]);
    }
  }

  async function startTranslation(payload: TranslatePayload) {
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
        targetLang: settings.targetLang,
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
      model,
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
    const url = paperUrl || location.href;
    await saveSession({
      url,
      title: paperTitle,
      model,
      messages: next,
      updatedAt: Date.now(),
    });
  }

  function selectModel(value: string) {
    const [providerId, selectedModel] = value.split('::');
    if (providerId && selectedModel) {
      setModel({ providerId: providerId as ModelRef['providerId'], model: selectedModel });
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
        <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={3} />
        <button type="submit">Send</button>
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
