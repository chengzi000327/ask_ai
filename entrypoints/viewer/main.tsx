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
      }

      setPages(renderedPages);
      setHasTextLayer(renderedPages.some((page) => page.lines.length > 0));
      setStatus('');
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
    const text = expandToSentence(allLines, globalLineIndex);
    if (!text) {
      return;
    }
    await chrome.runtime.sendMessage(
      createTranslateRequest({
        text,
        context: contextAround(allLines, globalLineIndex),
        paperUrl,
        paperTitle: title,
      }),
    );
  }

  async function translateSelection() {
    const text = window.getSelection()?.toString().trim();
    if (!text) {
      return;
    }
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
  const lines: string[] = [];
  for (const item of textContent.items) {
    if (isTextItem(item)) {
      const line = item.str.trim();
      if (line) {
        lines.push(line);
      }
    }
  }
  const lineOffset = Number(container.dataset.lineCount ?? '0');
  container.dataset.lineCount = String(lineOffset + lines.length);

  const textLayer = new TextLayer({
    textContentSource: textContent,
    container: textLayerEl,
    viewport,
  });
  await textLayer.render();
  textLayer.textDivs.forEach((div, index) => {
    div.dataset.lineIndex = String(lineOffset + index);
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
