import React, { useEffect, useRef } from 'react';

const modalBtn = {
  flex: 1, padding: 10, borderRadius: 6, cursor: 'pointer', fontWeight: 600,
};

const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', confirmDisabled = false }) => {
  const confirmRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    const id = setTimeout(() => confirmRef.current?.focus(), 0);
    return () => {
      clearTimeout(id);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    const handleKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Tab') {
        const focusable = confirmRef.current?.closest('[role="dialog"]')?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (!open && previousFocusRef.current) previousFocusRef.current.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 5000 }} onClick={onCancel}
      role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div className="modal-content" style={{ width: 380, maxWidth: '90vw', padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-modal-title" style={{ textAlign: 'center', marginBottom: 12, color: 'var(--dc-dark)' }}>{title}</h3>
        <p style={{ textAlign: 'center', color: 'var(--dc-text)', marginBottom: 20 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button ref={confirmRef} onClick={onCancel} style={{ ...modalBtn, border: '1px solid var(--dc-border)', background: 'var(--dc-cream)', color: 'var(--dc-text)' }}>{cancelText}</button>
          <button onClick={onConfirm} disabled={confirmDisabled} style={{ ...modalBtn, border: 'none', background: 'var(--dc-highlight)', color: 'var(--dc-white)' }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ConfirmModal);
