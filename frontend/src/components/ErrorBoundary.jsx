import React from 'react';
import { logger } from '../utils/logger';
import { LanguageContext } from '../context/LanguageContext';
import en from '../locales/en';
import fr from '../locales/fr';

const locales = { en, fr };

class ErrorBoundary extends React.Component {
  static contextType = LanguageContext;
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    logger.error({ err: error, info }, 'ErrorBoundary caught');
  }
  render() {
    if (this.state.error) {
      const lang = this.context?.lang === 'fr' ? 'fr' : 'en';
      const t = (key) => locales[lang][key] || key;
      return (
        <div className="page-teal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="card-teal" style={{ textAlign: 'center', padding: 40 }}>
            <h2>{t('errorBoundary.title')}</h2>
            <p style={{ color: '#e74c3c', margin: '12px 0' }}>{this.state.error.message}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>{t('errorBoundary.reload')}</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
