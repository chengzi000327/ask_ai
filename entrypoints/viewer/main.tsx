import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  GlobalWorkerOptions,
  TextLayer,
  getDocument,
  type PDFDocumentProxy,
} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { createTranslateRequest, type BusMessage } from '../../shared/messages';
import { expandToSentence } from '../../shared/sentence';
import './style.css';

GlobalWorkerOptions.workerSrc = workerUrl;

interface PageState {
  pageNumber: number;
  lines: string[];
}

function ViewerApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [paperUrl] = useState(() => new URLSearchParams(location.search).get('file') ?? '');
  const [title, setTitle] = useState('PDF');
  const [pages, setPages] = useState<PageState[]>([]);
  const [status, setStatus] = useState('Loading PDF...');
  const [hasTextLayer, setHasTextLayer] = useState(true);

  const allLines = useMemo(() => pages.flatMap((page) => page.lines), [pages]);
  // 点击处理从 ref 读行文本：渲染是逐页异步追加的，必须让已渲染的页面立即可点，
  // 不能等全部页面渲染完才更新 state。
  const allLinesRef = useRef<string[]>([]);
  allLinesRef.current = allLines;

  useEffect(() => {
    if (!paperUrl || !containerRef.current) {
      setStatus('Missing PDF URL.');
      return;
    }

    const container = containerRef.current;
    let cancelled = false;

    async function renderPdf() {
      const pdf = await getDocument(paperUrl).promise;
      if (cancelled) {
        return;
      }

      setTitle(filenameFromUrl(paperUrl));
      const renderedPages: PageState[] = [];
      const fullTextParts: string[] = [];
      container.innerHTML = '';

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const pageState = await renderPage(pdf, pageNumber, container, paperUrl);
        if (cancelled) {
          return;
        }
        renderedPages.push(pageState);
        fullTextParts.push(pageState.lines.join('\n'));
        // 逐页更新，已渲染页面立即可点击翻译
        setPages([...renderedPages]);
        if (pageNumber === 1) {
          setStatus('');
        }
      }

      setHasTextLayer(renderedPages.some((page) => page.lines.length > 0));
      await chrome.runtime.sendMessage({
        type: 'PAPER_LOADED',
        url: paperUrl,
        title: filenameFromUrl(paperUrl),
        fullText: fullTextParts.join('\n\n'),
      } satisfies BusMessage);
    }

    renderPdf().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : String(error));
    });

    return () => {
      cancelled = true;
    };
  }, [paperUrl]);

  async function translateLine(globalLineIndex: number) {
    const lines = allLinesRef.current;
    const text = expandToSentence(lines, globalLineIndex);
    if (!text) {
      return;
    }
    await chrome.runtime.sendMessage(
      createTranslateRequest({
        text,
        context: contextAround(lines, globalLineIndex),
        paperUrl,
        paperTitle: title,
      }),
    );
  }

  const lastSelectionRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });

  async function translateSelection() {
    const text = window.getSelection()?.toString().trim();
    if (!text) {
      return;
    }
    // 同一段选区短时间内只翻译一次（取消选区等动作可能再次触发 mouseup）
    const now = Date.now();
    if (text === lastSelectionRef.current.text && now - lastSelectionRef.current.at < 1500) {
      return;
    }
    lastSelectionRef.current = { text, at: now };
    await chrome.runtime.sendMessage(
      createTranslateRequest({
        text,
        context: text.slice(0, 1200),
        paperUrl,
        paperTitle: title,
      }),
    );
  }

  async function openNativeViewer() {
    await chrome.runtime.sendMessage({ type: 'BYPASS_PDF', url: paperUrl } satisfies BusMessage);
  }

  return (
    <main className="viewer-shell" onMouseUp={translateSelection}>
      <header className="toolbar">
        <strong>{title}</strong>
        <button type="button" onClick={openNativeViewer}>
          Open native viewer
        </button>
      </header>
      {!hasTextLayer && <div className="banner">No text layer found. Click translation is unavailable.</div>}
      {status && <div className="banner">{status}</div>}
      <div
        ref={containerRef}
        className="pages"
        onClick={(event) => {
          // 同一行内拖拽划选结束时浏览器也会派发 click；
          // 此刻仍有选区，说明这是划选（已由 mouseup 处理），不要再按整句翻译
          if (window.getSelection()?.toString().trim()) {
            return;
          }
          const target = event.target as HTMLElement;
          const line = target.closest<HTMLElement>('[data-line-index]');
          const lineIndex = Number(line?.dataset.lineIndex);
          if (Number.isFinite(lineIndex)) {
            void translateLine(lineIndex);
          }
        }}
      />
    </main>
  );
}

async function renderPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  container: HTMLElement,
  paperUrl: string,
): Promise<PageState> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.35 });
  const pageEl = document.createElement('section');
  pageEl.className = 'pdf-page';
  pageEl.style.width = `${viewport.width}px`;
  pageEl.style.height = `${viewport.height}px`;

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  pageEl.append(canvas);

  const textLayerEl = document.createElement('div');
  textLayerEl.className = 'textLayer';
  pageEl.append(textLayerEl);
  container.append(pageEl);

  await page.render({
    canvas,
    canvasContext: canvas.getContext('2d')!,
    viewport,
  }).promise;

  const textContent = await page.getTextContent();
  // textDivs 与 textContent.items 一一对应（含空白项）。lines 只收非空文本，
  // 所以 data-line-index 必须按"非空项的序号"分配，否则索引与 lines 错位。
  const lines: string[] = [];
  const itemLineIndex: (number | null)[] = textContent.items.map((item) => {
    if (isTextItem(item) && item.str.trim()) {
      lines.push(item.str.trim());
      return lines.length - 1;
    }
    return null;
  });
  const lineOffset = Number(container.dataset.lineCount ?? '0');
  container.dataset.lineCount = String(lineOffset + lines.length);

  const textLayer = new TextLayer({
    textContentSource: textContent,
    container: textLayerEl,
    viewport,
  });
  await textLayer.render();
  textLayer.textDivs.forEach((div, index) => {
    const localIndex = itemLineIndex[index];
    if (localIndex !== null && localIndex !== undefined) {
      div.dataset.lineIndex = String(lineOffset + localIndex);
    }
  });

  pageEl.dataset.paperUrl = paperUrl;
  return { pageNumber, lines };
}

function isTextItem(item: unknown): item is { str: string } {
  return typeof item === 'object' && item !== null && 'str' in item;
}

function contextAround(lines: string[], lineIndex: number): string {
  return lines.slice(Math.max(0, lineIndex - 8), lineIndex + 9).join('\n');
}

function filenameFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).at(-1) ?? 'PDF');
  } catch {
    return 'PDF';
  }
}

createRoot(document.getElementById('root')!).render(<ViewerApp />);
