import React from 'react';

const Spinner = React.memo(({ size = 24, text = 'Loading...' }) => (
  <div role="status" aria-label={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20, justifyContent: 'center' }}>
    <div className="conic-spinner" style={{ width: size, height: size }} />
    <span style={{ color: 'var(--dc-text, #333)', fontSize: '0.9rem' }}>{text}</span>
  </div>
));

export default Spinner;
