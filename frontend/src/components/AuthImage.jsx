/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { fetchWithAuth, API_BASE_URL } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import '../styles/authImage.css';

const isDirectSrc = (src) => src.startsWith('blob:') || src.startsWith('data:');

// Session-wide cache: src -> object URL. Survives remounts so images show
// instantly when navigating back to a question. Revoked on page unload.
const urlCache = new Map();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    for (const u of urlCache.values()) URL.revokeObjectURL(u);
    urlCache.clear();
  });
}

// Authenticated <img> replacement. Images are fetched on demand: a gray box
// with a "click to see picture" button is shown first; once viewed, the blob
// is cached for the rest of the session. blob:/data: sources pass through.
const AuthImage = ({ src, alt = '', style, className, loading = 'eager', onError, ...rest }) => {
  const { t } = useTranslation();
  const [loadSeq, setLoadSeq] = useState(0);
  const [loadingSrc, setLoadingSrc] = useState(null);
  const [failedSrc, setFailedSrc] = useState(null);

  const direct = src ? isDirectSrc(src) : false;
  const cached = src && !direct ? urlCache.get(src) : null;
  const isLoading = !!src && loadingSrc === src;
  const hasFailed = !!src && failedSrc === src;

  // Small boxes (60-80px thumbnails) can't fit the text label — icon-only pill
  const boxHeight = typeof style?.height === 'number' ? style.height : null;
  const boxWidth = typeof style?.width === 'number' ? style.width : null;
  const compact = (boxHeight !== null && boxHeight <= 120) || (boxWidth !== null && boxWidth <= 140);

  const startLoad = () => {
    if (isLoading) return;
    setFailedSrc(null);
    setLoadingSrc(src);
    setLoadSeq((n) => n + 1);
  };

  useEffect(() => {
    if (!loadSeq || !src || isDirectSrc(src)) return undefined;
    let active = true;
    (async () => {
      try {
        const full = src.startsWith('http') ? src : `${API_BASE_URL}${src}`;
        const res = await fetchWithAuth(full);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        urlCache.set(src, URL.createObjectURL(blob));
      } catch {
        // cached on success only — surface a retry button on failure
      } finally {
        if (active) {
          setLoadingSrc(null);
          setLoadSeq(0);
          if (!urlCache.has(src)) setFailedSrc(src);
        }
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSeq]);

  if (!src) return null;

  if (direct) {
    return <img src={src} alt={alt} className={className} style={style} loading={loading} onError={onError} {...rest} />;
  }

  if (cached) {
    return <img src={cached} alt={alt} className={className} style={style} loading={loading} onError={onError} {...rest} />;
  }

  const label = hasFailed ? t('quiz.retry') : t('quiz.clickToView');
  const icon = hasFailed ? '↻' : '🖼';

  return (
    <div
      className={`authimg-box${isLoading ? ' authimg-loading' : ''}`}
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...(compact && boxHeight !== null ? { minHeight: boxHeight } : {}),
      }}
      title={label}
    >
      {isLoading ? (
        <span className="authimg-label" style={compact ? { fontSize: 11 } : undefined}>
          {compact ? '…' : t('quiz.imageLoading')}
        </span>
      ) : (
        <button
          type="button"
          className={`authimg-btn${hasFailed ? ' authimg-retry' : ''}`}
          onClick={startLoad}
          aria-label={label}
          title={label}
          style={compact ? { padding: '4px 10px', fontSize: 13 } : undefined}
        >
          {compact ? icon : `${icon} ${label}`}
        </button>
      )}
    </div>
  );
};

export default AuthImage;
