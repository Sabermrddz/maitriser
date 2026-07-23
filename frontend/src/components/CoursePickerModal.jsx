import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

const CoursePickerModal = ({ modules, onNext, onClose }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState({});

  const getCourseName = (c) => (typeof c === 'string' ? c : c.name || '');

  const toggleCourse = (modIdx, courseName) => {
    setSelected((prev) => {
      const key = `${modIdx}::${courseName}`;
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const toggleModule = (mod, modIdx) => {
    const allSelected = mod.courses.every((c) => selected[`${modIdx}::${getCourseName(c)}`]);
    setSelected((prev) => {
      const next = { ...prev };
      for (const c of mod.courses) {
        const name = getCourseName(c);
        if (allSelected) delete next[`${modIdx}::${name}`];
        else next[`${modIdx}::${name}`] = true;
      }
      return next;
    });
  };

  const selectedKeys = Object.keys(selected);
  const selectedCount = selectedKeys.length;

  const handleNext = () => {
    const courseNames = selectedKeys.map((k) => k.split('::')[1]);
    onNext(courseNames);
  };

  return (
    <div className="ecos-overlay" onClick={onClose}>
      <div className="ecos-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <h3>{t('coursePicker.title')}</h3>
        <p className="ecos-modal-subtitle">{t('coursePicker.description')}</p>

        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--teal-dark)', marginBottom: 16 }}>
          {selectedCount > 0
            ? t('coursePicker.selectedCount', { count: selectedCount })
            : t('coursePicker.noSelection')}
        </div>

        <div className="ecos-chip-grid" style={{ maxHeight: 360 }}>
          {modules.map((mod, modIdx) => (
            <div key={mod._id} style={{
              marginBottom: 8, border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
            }}>
              <div
                className={`ecos-check-row${mod.courses.every((c) => selected[`${modIdx}::${getCourseName(c)}`]) ? ' selected' : ''}`}
                style={{ border: 'none', borderRadius: 0, marginBottom: 0 }}
                onClick={() => toggleModule(mod, modIdx)}
                onKeyDown={(e) => { if (e.key === 'Enter') toggleModule(mod, modIdx); }}
                role="button" tabIndex={0}
              >
                <input type="checkbox" readOnly checked={mod.courses.every((c) => selected[`${modIdx}::${getCourseName(c)}`])} />
                <span className="check-label">{mod.name}</span>
                <span className="check-meta">{mod.courses.length}</span>
              </div>
              <div style={{ padding: '4px 14px 8px' }}>
                {mod.courses.map((c, ci) => {
                  const name = getCourseName(c);
                  const checked = !!selected[`${modIdx}::${name}`];
                  return (
                    <label key={ci} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
                      cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-body)',
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCourse(modIdx, name)}
                        style={{ accentColor: 'var(--teal-dark)', width: 15, height: 15 }} />
                      {name}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="ecos-modal-actions">
          <button type="button" className="btn-primary" onClick={handleNext} disabled={selectedCount === 0}>
            {t('coursePicker.next')} ({selectedCount})
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoursePickerModal;
