import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle';
import { API_BASE_URL } from '../config/api';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import '../styles/pagesStyle/contact.css';
import '../styles/teal-theme.css';

const ContactPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  useDocumentTitle(t('contact.title'));
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: searchParams.get('subject') || '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const { name, email, message } = formData;
    const newErrors = {};
    if (!name) newErrors.name = t('contact.error.name');
    if (!email) newErrors.email = t('contact.error.email');
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = t('contact.error.emailInvalid');
    if (!message) newErrors.message = t('contact.error.message');
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/contact/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setSuccessMessage(t('contact.success'));
        setErrorMessage('');
        setFormData({ name: '', email: '', message: '' });
        setErrors({});
      } catch (err) {
        logger.error({ err }, 'ContactPage submit failed');
        setSuccessMessage('');
        setErrorMessage(t('contact.error.general'));
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(newErrors);
      setSuccessMessage('');
      setErrorMessage('');
    }
  };

  return (
    <div className="page-teal">
      <div className="card-teal" style={{ maxWidth: '600px' }}>
        <h2 style={{ marginBottom: '24px' }}>{t('contact.title')}</h2>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">{t('contact.name')}</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
            {errors.name && <p className="error">{errors.name}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="email">{t('contact.email')}</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            {errors.email && <p className="error">{errors.email}</p>}
          </div>
          <div className="form-group">
            <label htmlFor="subject">{t('contact.subject')}</label>
            <input type="text" id="subject" name="subject" value={formData.subject} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="message">{t('contact.message')}</label>
            <textarea id="message" name="message" value={formData.message} onChange={handleChange} required />
            {errors.message && <p className="error">{errors.message}</p>}
          </div>
          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? t('contact.sending') : t('contact.send')}
          </button>
          {successMessage && <p className="success">{successMessage}</p>}
          {errorMessage && <p className="error">{errorMessage}</p>}
        </form>
      </div>
    </div>
  );
};

export default ContactPage;
