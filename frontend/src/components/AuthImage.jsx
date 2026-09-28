/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { fetchWithAuth, API_BASE_URL } from '../config/api';

const isDirectSrc = (src) => src.startsWith('blob:') || src.startsWith('data:');

const placeholderStyle = (style) => ({
  ...style,
  minHeight: 48,
  minWidth: 48,
  background: 'var(--bg-light, rgba(0,0,0,0.05))',
  border: '1px dashed var(--border-light, #d0d5dd)',
  borderRadius: style?.borderRadius || 6,
});

// Authenticated <img> replacement: downloads via Authorization header (works
// cross-origin, after cookie expiry, and behind HTTP) and renders a blob.
// blob:/data: sources pass through untouched. Failures render a neutral
// placeholder instead of a broken-image icon.
const AuthImage = ({ src, alt = '', style, className, loading = 'lazy', onError, ...rest }) => {
  const [url, setUrl] = useState(() => (src && isDirectSrc(src) ? src : null));
  const [failed, setFailed] = useState(false);

  const direct = src ? isDirectSrc(src) : false;

  useEffect(() => {
    if (!src || isDirectSrc(src)) return undefined;
    let active = true;
    let objectUrl = null;
    setFailed(false);
    setUrl(null);
    (async () => {
      try {
        const full = src.startsWith('http') ? src : `${API_BASE_URL}${src}`;
        const res = await fetchWithAuth(full);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src) return null;

  if (direct) {
    return <img src={src} alt={alt} className={className} style={style} loading={loading} onError={onError} {...rest} />;
  }

  if (failed) {
    return (
      <div
        className={className}
        style={placeholderStyle(style)}
        role="img"
        aria-label={alt}
        title={alt}
      />
    );
  }

  if (!url) {
    return <div className={className} style={placeholderStyle(style)} aria-hidden="true" />;
  }

  return (
    <img src={url} alt={alt} className={className} style={style} loading={loading} onError={onError} {...rest} />
  );
};

export default AuthImage;
