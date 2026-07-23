import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../context/LanguageContext';

export default function EcosModuleFilterModal({ modules, onSelect, onClose }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = modules.filter((m) =>
    m.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card-teal"
        style={{
          maxWidth: 420, width: '100%', padding: 0, maxHeight: '80vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '20px 20px 0' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>{t('ecosCustomSetup.filterTitle')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 12px' }}>
            {t('ecosCustomSetup.filterDesc')}
          </p>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('voiceExams.allSpecialties')}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              border: '1px solid var(--border-light)', fontSize: 14,
              boxSizing: 'border-box', marginBottom: 12,
              background: 'var(--card-bg)', color: 'var(--text-dark)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 12px' }}>
          <button
            type="button"
            onClick={() => { onSelect(''); onClose(); }}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
              border: '1px solid var(--border-light)', background: 'var(--color-bg)',
              fontWeight: 600, fontSize: 14, color: 'var(--text-dark)', textAlign: 'left',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal-dark)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
          >
            {t('ecosCustomSetup.allModules')}
          </button>
          {filtered.map((m) => (
            <button
              key={m._id}
              type="button"
              onClick={() => { onSelect(m._id); onClose(); }}
              style={{
                width: '100%', padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                border: '1px solid transparent', background: 'var(--color-bg)',
                fontSize: 14, color: 'var(--text-dark)', textAlign: 'left',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--card-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--color-bg)'; }}
            >
              {m.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
              {t('voiceExams.noExams')}
            </p>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-light)',
              background: 'var(--card-bg)', color: 'var(--text-dark)', cursor: 'pointer',
              fontWeight: 600, width: '100%', fontSize: 14,
            }}
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
