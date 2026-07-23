import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import EcosModuleFilterModal from './EcosModuleFilterModal';

export default function EcosCustomizedSetup({ modules, allExams, onStart, onBack }) {
  const { t } = useTranslation();

  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [stationCount, setStationCount] = useState(3);
  const [minutesPerStation, setMinutesPerStation] = useState(10);

  const filteredExams = useMemo(() => {
    if (!selectedModuleId) return allExams;
    return allExams.filter((e) => String(e.moduleId?._id || e.moduleId) === selectedModuleId);
  }, [selectedModuleId, allExams]);

  const maxStations = Math.min(filteredExams.length, 10);
  const selectedModule = modules.find((m) => m._id === selectedModuleId);
  const canStart = stationCount >= 1 && stationCount <= maxStations && filteredExams.length > 0;

  const handleStart = () => {
    if (!canStart) return;
    const shuffled = [...filteredExams].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, stationCount);
    onStart({ exams: picked, stationCount, minutesPerStation });
  };

  return (
    <div className="page-teal">
      <div className="card-teal" style={{ maxWidth: 480, margin: '0 auto', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '24px 24px 0' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none', border: '1px solid var(--border-light)', borderRadius: 8,
              padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: 'var(--text-dark)',
              marginBottom: 16, transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            &larr; {t('ecosCustomSetup.back')}
          </button>

          <h3 style={{ margin: '0 0 4px', fontSize: 18 }}>{t('ecosCustomSetup.title')}</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
            {t('ecosCustomSetup.subtitle')}
          </p>
        </div>

        <div style={{ padding: '0 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-dark)' }}>
              {t('ecosCustomSetup.stepTopic')}
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              {t('ecosCustomSetup.stepTopicDesc')}
            </p>
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                border: '1px solid var(--border-light)', background: 'var(--card-bg)',
                color: 'var(--text-dark)', cursor: 'pointer', fontSize: 14,
                textAlign: 'left', fontWeight: selectedModule ? 600 : 400,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--teal-dark)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            >
              <span>{selectedModule ? selectedModule.name : t('ecosCustomSetup.allModules')}</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>&#9660;</span>
            </button>
          </div>

          <div style={{
            height: 1, background: 'var(--border-light)', marginBottom: 20, opacity: 0.5,
          }} />

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-dark)' }}>
              {t('ecosCustomSetup.stepStations')}
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              {t('ecosCustomSetup.stepStationsDesc')}
            </p>
            <input
              type="number"
              min={1}
              max={maxStations || 1}
              value={stationCount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v)) setStationCount(Math.max(1, Math.min(v, maxStations || 1)));
              }}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border-light)', fontSize: 14,
                boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)',
                outline: 'none', transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--teal-dark)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            />
            {filteredExams.length > 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                {t('simulation.maxStations', { max: maxStations })} &middot; {filteredExams.length} {t('ecosCustomSetup.stations').toLowerCase()}
              </span>
            ) : (
              <span style={{ fontSize: 11, color: '#e74c3c', marginTop: 4, display: 'block' }}>
                {t('voiceExams.noExams')}
              </span>
            )}
          </div>

          <div style={{
            height: 1, background: 'var(--border-light)', marginBottom: 20, opacity: 0.5,
          }} />

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text-dark)' }}>
              {t('ecosCustomSetup.stepTime')}
            </label>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
              {t('ecosCustomSetup.stepTimeDesc')}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min={1}
                max={30}
                value={minutesPerStation}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v)) setMinutesPerStation(Math.max(1, Math.min(v, 30)));
                }}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border-light)', fontSize: 14,
                  boxSizing: 'border-box', background: 'var(--card-bg)', color: 'var(--text-dark)',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--teal-dark)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {t('ecosCustomSetup.min')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 24px 24px' }}>
          <button
            type="button"
            onClick={handleStart}
            disabled={!canStart}
            style={{
              padding: '12px 24px', borderRadius: 8, border: 'none',
              background: canStart ? 'var(--teal-dark)' : '#ccc',
              color: '#fff', fontWeight: 'bold', cursor: canStart ? 'pointer' : 'not-allowed',
              width: '100%', fontSize: 15, transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { if (canStart) e.currentTarget.style.background = 'var(--teal-accent)'; }}
            onMouseLeave={(e) => { if (canStart) e.currentTarget.style.background = 'var(--teal-dark)'; }}
          >
            {t('ecosCustomSetup.start')}
          </button>
        </div>
      </div>

      {showFilter && (
        <EcosModuleFilterModal
          modules={modules}
          onSelect={(id) => setSelectedModuleId(id)}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
