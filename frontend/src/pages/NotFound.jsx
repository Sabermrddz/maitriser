import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import useDocumentTitle from '../utils/useDocumentTitle';

const NotFound = () => {
  useDocumentTitle('404');
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="page-teal">
      <div className="card-teal" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#14a3a8', marginBottom: '8px' }}>404</div>
        <h2 style={{ marginBottom: '8px' }}>{t('notFound.title')}</h2>
        <p style={{ color: '#888', marginBottom: '24px' }}>{t('notFound.message')}</p>
        <button className="btn-primary" onClick={() => navigate('/')}>{t('notFound.back')}</button>
      </div>
    </div>
  );
};

export default NotFound;
