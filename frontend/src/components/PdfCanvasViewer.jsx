/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerConfigured = false;

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    workerConfigured = true;
  }
  return pdfjs;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

// Inline PDF viewer: renders pages to canvas with PDF.js so PDFs display on
// every device (mobile browsers cannot render PDFs in iframes). `src` is a
// blob: URL of the already-fetched PDF. The bar's "open in new tab" link is
// kept by the parent as the native-viewer escape hatch.
const PdfCanvasViewer = ({ src, title = '' }) => {
  const { t } = useTranslation();
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitted, setFitted] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Load + parse the document
  useEffect(() => {
    let alive = true;
    let doc = null;
    setLoading(true);
    setError(false);
    setPdfDoc(null);
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const res = await fetch(src);
        if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`);
        const data = await res.arrayBuffer();
        if (!alive) return;
        doc = await pdfjs.getDocument({ data }).promise;
        if (!alive) {
          await doc.destroy().catch(() => {});
          return;
        }
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
        // Fit first page to container width
        try {
          const page = await doc.getPage(1);
          const w = wrapRef.current?.clientWidth || 600;
          const vw = page.getViewport({ scale: 1 });
          const fit = Math.min(2.5, Math.max(MIN_SCALE, (w - 24) / vw.width));
          if (alive) {
            setScale(fit);
            setFitted(true);
          }
        } catch {
          if (alive) setScale(1);
        }
      } catch (e) {
        logger.error({ e }, 'PdfCanvasViewer load failed');
        if (alive) setError(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
      if (doc) doc.destroy().catch(() => {});
    };
  }, [src, attempt]);

  // Render current page (cancels in-flight renders on page/zoom change)
  useEffect(() => {
    if (!pdfDoc) return undefined;
    let cancelled = false;
    let task = null;
    (async () => {
      try {
        const page = await pdfDoc.getPage(Math.min(Math.max(pageNum, 1), pdfDoc.numPages));
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const ctx = canvas.getContext('2d');
        task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
      } catch (e) {
        if (!cancelled && e?.name !== 'RenderingCancelledException') {
          logger.error({ e }, 'PdfCanvasViewer render failed');
        }
      }
    })();
    return () => {
      cancelled = true;
      if (task) {
        try { task.cancel(); } catch { /* already finished */ }
      }
    };
  }, [pdfDoc, pageNum, scale]);

  // Re-fit on viewport resize until the user zooms manually
  useEffect(() => {
    if (!fitted || !pdfDoc) return undefined;
    let t = null;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          const page = await pdfDoc.getPage(1);
          const w = wrapRef.current?.clientWidth || 600;
          const vw = page.getViewport({ scale: 1 });
          setScale(Math.min(2.5, Math.max(MIN_SCALE, (w - 24) / vw.width)));
        } catch { /* keep current scale */ }
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      clearTimeout(t);
    };
  }, [fitted, pdfDoc]);

  const goPage = useCallback((delta) => {
    setPageNum((p) => Math.min(Math.max(p + delta, 1), numPages || 1));
  }, [numPages]);

  const zoom = useCallback((factor) => {
    setFitted(false);
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s * factor)));
  }, []);

  if (error) {
    return (
      <div className="pdf-viewer-state">
        <div className="pdf-viewer-icon" aria-hidden="true">PDF</div>
        <p>{t('pdfViewer.loadError')}</p>
        <button type="button" className="btn-primary" onClick={() => setAttempt((a) => a + 1)}>
          {t('pdfViewer.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="pdf-viewer" ref={wrapRef}>
      <div className="pdf-viewer-scroll">
        {loading ? (
          <div className="pdf-viewer-state">
            <div className="pdf-viewer-spinner" aria-hidden="true" />
            <p>{t('pdfViewer.loading')}</p>
          </div>
        ) : (
          <canvas ref={canvasRef} className="pdf-viewer-canvas" role="img" aria-label={title} />
        )}
      </div>
      {!loading && numPages > 0 && (
        <div className="pdf-viewer-toolbar">
          <button type="button" className="pdf-viewer-btn" onClick={() => goPage(-1)} disabled={pageNum <= 1} aria-label={t('pdfViewer.prevPage')}>
            ‹
          </button>
          <span className="pdf-viewer-page">{t('pdfViewer.pageOf', { current: pageNum, total: numPages })}</span>
          <button type="button" className="pdf-viewer-btn" onClick={() => goPage(1)} disabled={pageNum >= numPages} aria-label={t('pdfViewer.nextPage')}>
            ›
          </button>
          <span className="pdf-viewer-sep" aria-hidden="true" />
          <button type="button" className="pdf-viewer-btn" onClick={() => zoom(1 / 1.25)} disabled={scale <= MIN_SCALE + 0.01} aria-label={t('pdfViewer.zoomOut')}>
            −
          </button>
          <button type="button" className="pdf-viewer-btn" onClick={() => zoom(1.25)} disabled={scale >= MAX_SCALE - 0.01} aria-label={t('pdfViewer.zoomIn')}>
            +
          </button>
        </div>
      )}
    </div>
  );
};

export default PdfCanvasViewer;
