import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

const CustomizedExamModal = ({ maxQuestions, onStart, onClose }) => {
  const { t } = useTranslation();
  const [questionCount, setQuestionCount] = useState(Math.min(maxQuestions, 10));
  const [passingScore, setPassingScore] = useState(60);
  const [random, setRandom] = useState(true);
  const [layout, setLayout] = useState('oneByOne');

  const handleStart = () => {
    onStart({ questionCount: Math.min(questionCount, maxQuestions), passingScore, random, layout });
  };

  return (
    <div className="ecos-overlay" onClick={onClose}>
      <div className="ecos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3>{t('customExam.title')}</h3>

        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>
            {t('customExam.questionCount')} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(max {maxQuestions})</span>
          </label>
          <input
            type="number"
            min={1}
            max={maxQuestions}
            value={questionCount}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setQuestionCount(Math.max(1, Math.min(v, maxQuestions))); }}
            className="form-input"
            style={{ maxWidth: 140 }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 6 }}>
            {t('customExam.passingScore')}
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setPassingScore(Math.max(0, Math.min(v, 100))); }}
            className="form-input"
            style={{ maxWidth: 120 }}
          />
        </div>

        <div
          className={`ecos-check-row${random ? ' selected' : ''}`}
          onClick={() => setRandom(!random)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRandom(!random); } }}
          style={{ marginTop: 16 }}
        >
          <input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} />
          <span className="check-label">{t('customExam.random')}</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-dark)', marginBottom: 8 }}>
            {t('customExam.layout')}
          </label>
          <div className="ecos-time-presets">
            <button
              type="button"
              className={`ecos-time-btn${layout === 'oneByOne' ? ' active' : ''}`}
              onClick={() => setLayout('oneByOne')}
            >
              {t('customExam.layout.oneByOne')}
            </button>
            <button
              type="button"
              className={`ecos-time-btn${layout === 'allInPage' ? ' active' : ''}`}
              onClick={() => setLayout('allInPage')}
            >
              {t('customExam.layout.allInPage')}
            </button>
          </div>
        </div>

        <div className="ecos-modal-actions">
          <button type="button" className="btn-primary" onClick={handleStart}>
            ▶ {t('customExam.startExam')}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizedExamModal;
