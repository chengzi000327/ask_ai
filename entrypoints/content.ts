import { createTranslateRequest, type BusMessage } from '../shared/messages';

// 扩展刷新/更新后，旧内容脚本仍残留在已打开的页面里，任何 chrome.* 调用都会抛
// "Extension context invalidated"，在 chrome://extensions 里堆出一片红色错误。
// 这里统一吞掉这类失效错误，让旧脚本安静退场。
async function safeSendMessage(message: BusMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch {
    // context 已失效或后台暂不可达；刷新页面后由新脚本接管
  }
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    document.documentElement.dataset.askAiContent = 'ready';

    const paper = getPageContext();
    void safeSendMessage({
      type: 'PAPER_LOADED',
      url: location.href,
      title: paper.title,
      fullText: paper.fullText,
    } satisfies BusMessage);

    document.addEventListener('click', (event) => {
      if (!event.altKey) {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      const block = target?.closest('p, li, blockquote, section, article');
      const text = block?.textContent?.trim();
      if (!block || !text) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      void requestTranslation(text, surroundingText(block), paper.title);
    });

    document.addEventListener('mouseup', () => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text) {
        return;
      }
      const anchor = selection?.anchorNode;
      const anchorElement = anchor instanceof Element ? anchor : anchor?.parentElement;
      void requestTranslation(
        text,
        anchorElement ? surroundingText(anchorElement) : text.slice(0, 1200),
        paper.title,
      );
    });
  },
});

function getPageContext(): { title: string; fullText: string } {
  const title = document.title || document.querySelector('h1')?.textContent?.trim() || location.href;
  const root =
    document.querySelector('article') ??
    document.querySelector('main') ??
    document.querySelector('[role="main"]') ??
    document.body;
  return {
    title,
    fullText: normalizeText(root?.textContent ?? ''),
  };
}

async function requestTranslation(text: string, context: string, paperTitle: string): Promise<void> {
  await safeSendMessage(
    createTranslateRequest({
      text: normalizeText(text),
      context: normalizeText(context),
      paperUrl: location.href,
      paperTitle,
    }),
  );
}

function surroundingText(element: Element): string {
  const parent = element.closest('article, main, section') ?? element.parentElement ?? element;
  return normalizeText(parent.textContent ?? '').slice(0, 2400);
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
