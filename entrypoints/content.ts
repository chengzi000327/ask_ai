import { createTranslateRequest, type BusMessage } from '../shared/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    document.documentElement.dataset.askAiContent = 'ready';

    const paper = getPageContext();
    void chrome.runtime.sendMessage({
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
  await chrome.runtime.sendMessage(
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
