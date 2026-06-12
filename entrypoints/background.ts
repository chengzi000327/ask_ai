import { AnthropicProvider } from '../providers/anthropic';
import { OpenAICompatProvider } from '../providers/openai-compat';
import { ProviderError } from '../providers/provider';
import { loadSettings, type StorageLike } from '../shared/settings';
import {
  CHAT_PORT_NAME,
  type BusMessage,
  type ChatPortEvent,
  type ChatPortRequest,
} from '../shared/messages';
import type { PaperContext, Provider } from '../shared/types';

const papers = new Map<string, PaperContext>();
const bypassPdfUrls = new Set<string>();
let pendingTranslate: Extract<BusMessage, { type: 'TRANSLATE_REQUEST' }> | null = null;

export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener(() => {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  });

  chrome.webRequest.onHeadersReceived.addListener(
    (details) => {
      if (details.tabId < 0 || details.type !== 'main_frame' || bypassPdfUrls.has(details.url)) {
        return undefined;
      }

      const contentType = details.responseHeaders?.find(
        (header) => header.name.toLowerCase() === 'content-type',
      )?.value;
      if (contentType?.toLowerCase().includes('application/pdf')) {
        void chrome.tabs.update(details.tabId, { url: viewerUrl(details.url) });
      }
      return undefined;
    },
    { urls: ['<all_urls>'], types: ['main_frame'] },
    ['responseHeaders'],
  );

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'loading' || !tab.url || bypassPdfUrls.has(tab.url)) {
      return;
    }
    if (tab.url.startsWith('file://') && tab.url.toLowerCase().endsWith('.pdf')) {
      void chrome.tabs.update(tabId, { url: viewerUrl(tab.url) });
    }
  });

  chrome.runtime.onMessage.addListener((message: BusMessage, sender, sendResponse) => {
    void handleMessage(message, sender).then(sendResponse, (error: unknown) => {
      sendResponse({ error: error instanceof Error ? error.message : String(error) });
    });
    return true;
  });

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== CHAT_PORT_NAME) {
      return;
    }
    handleChatPort(port);
  });
});

async function handleMessage(message: BusMessage, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case 'PAPER_LOADED': {
      papers.set(message.url, {
        url: message.url,
        title: message.title,
        fullText: message.fullText,
      });
      return;
    }
    case 'GET_PAPER':
      return papers.get(message.url) ?? null;
    case 'TRANSLATE_REQUEST': {
      pendingTranslate = message;
      // 必须先 open：侧边栏未打开时广播没有接收方会抛错，且 open 依赖用户手势上下文，
      // 任何前置 await 都可能让手势失效。
      if (sender.tab?.id !== undefined) {
        await chrome.sidePanel.open({ tabId: sender.tab.id });
      }
      await broadcastTranslate(message);
      return;
    }
    case 'TRANSLATE_PUSH':
      await sendTranslatePush(message.payload);
      return;
    case 'GET_PENDING_TRANSLATE': {
      const payload = pendingTranslate;
      pendingTranslate = null;
      return payload;
    }
    case 'BYPASS_PDF':
      bypassPdfUrls.add(message.url);
      if (sender.tab?.id !== undefined) {
        await chrome.tabs.update(sender.tab.id, { url: message.url });
      }
      return;
  }
}

function handleChatPort(port: chrome.runtime.Port): void {
  const controller = new AbortController();

  port.onDisconnect.addListener(() => {
    controller.abort();
  });

  port.onMessage.addListener((request: ChatPortRequest) => {
    void streamChat(request, controller.signal, (event) => {
      port.postMessage(event);
    });
  });
}

async function streamChat(
  request: ChatPortRequest,
  signal: AbortSignal,
  postEvent: (event: ChatPortEvent) => void,
): Promise<void> {
  try {
    const settings = await loadSettings(chromeStorage);
    const config = settings.providers.find((provider) => provider.id === request.model.providerId);
    if (!config || !config.apiKey) {
      throw new ProviderError('API key is not configured for the selected provider.', 401);
    }

    const provider = createProvider(config.kind);
    const full = await provider.chat({
      config,
      model: request.model.model,
      messages: request.messages,
      onDelta: (text) => postEvent({ type: 'delta', text }),
      signal,
    });
    postEvent({ type: 'done', full });
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    postEvent(toErrorEvent(error));
  }
}

function createProvider(kind: string): Provider {
  if (kind === 'anthropic') {
    return new AnthropicProvider();
  }
  return new OpenAICompatProvider();
}

function toErrorEvent(error: unknown): ChatPortEvent {
  if (error instanceof ProviderError) {
    return error.status === undefined
      ? { type: 'error', message: error.message }
      : { type: 'error', message: error.message, status: error.status };
  }
  return {
    type: 'error',
    message: error instanceof Error ? error.message : String(error),
  };
}

async function broadcastTranslate(payload: Extract<BusMessage, { type: 'TRANSLATE_REQUEST' }>) {
  const { type: _type, ...translatePayload } = payload;
  const delivered = await sendTranslatePush(translatePayload);
  if (delivered) {
    // 侧边栏已在线并收到了这次推送，清掉 pending，避免下次打开侧边栏时重放旧翻译。
    pendingTranslate = null;
  }
}

async function sendTranslatePush(
  payload: Extract<BusMessage, { type: 'TRANSLATE_PUSH' }>['payload'],
): Promise<boolean> {
  try {
    await chrome.runtime.sendMessage({ type: 'TRANSLATE_PUSH', payload } satisfies BusMessage);
    return true;
  } catch {
    // 侧边栏尚未打开（无接收方）时 sendMessage 会抛错；刚 open 的侧边栏
    // 会通过 GET_PENDING_TRANSLATE 取件，这里吞掉错误即可。
    return false;
  }
}

function viewerUrl(url: string): string {
  return chrome.runtime.getURL(`/viewer.html?file=${encodeURIComponent(url)}`);
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
