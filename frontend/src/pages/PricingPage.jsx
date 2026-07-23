import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, fetchWithAuth } from '../config/api';
import { useToast } from '../components/Toast';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/pricing.css';
import '../styles/teal-theme.css';

const PricingPage = () => {
  const notify = useToast();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  useDocumentTitle(t('pricing.title'));
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribingId, setSubscribingId] = useState(null);
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({ instructions: '', imageUrl: '' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const userDiscipline = (() => { try { return localStorage.getItem('userDiscipline') || ''; } catch { return ''; } })();
  const userYear = (() => { try { return localStorage.getItem('userYear') || ''; } catch { return ''; } })();

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      let url = `${API_BASE_URL}/api/plans`;
      const params = new URLSearchParams();
      if (userDiscipline) params.set('discipline', userDiscipline);
      if (userYear) params.set('year', userYear);
      const qs = params.toString();
      if (qs) url += `?${qs}`;
      const res = await fetch(url);
      if (res.ok) setPlans(await res.json());
    } catch (err) { logger.error({ err }, 'Failed to fetch plans'); }
    setLoading(false);
  };

  const fetchSubscription = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/subscription`);
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch (err) { logger.error({ err }, 'Failed to fetch subscription'); }
  };

  const handleFreeSubscribe = async (plan) => {
    setSubscribingId(plan._id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/plans/${plan._id}/subscribe`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        notify(t('pricing.freeActivated', { planName: data.planName }), 'success');
        fetchSubscription();
      } else {
        notify(data.message || t('admin.pricing.error'), 'error');
      }
    } catch {
      notify(t('pricing.networkError'), 'error');
    } finally {
      setSubscribingId(null);
    }
  };

  const handleRedeem = async () => {
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    setRedeemError('');
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/redeem-code`, {
        method: 'POST',
        body: { code: redeemCode.trim() },
      });
      const data = await res.json();
      if (res.ok) {
        notify(t('pricing.activated', { planName: data.planName }), 'success');
        setRedeemCode('');
        fetchSubscription();
      } else {
        setRedeemError(data.message || t('pricing.invalidCode'));
      }
    } catch {
      setRedeemError(t('pricing.networkError'));
    } finally {
      setRedeeming(false);
    }
  };

  const fetchPaymentInfo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/payment-info`);
      if (res.ok) setPaymentInfo(await res.json());
    } catch { /* ignore */ }
  };

  const handlePaidSubscribe = async (plan) => {
    setSelectedPlan(plan);
    setPaymentMessage('');
    setPaymentFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await fetchPaymentInfo();
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!paymentMessage.trim()) return notify(t('pricing.paymentModal.messageRequired'), 'warning');
    setPaymentSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('planId', selectedPlan._id);
      fd.append('message', paymentMessage.trim());
      if (paymentFile) fd.append('receiptImage', paymentFile);
      const res = await fetchWithAuth(`${API_BASE_URL}/api/payments/payment-intent`, { method: 'POST', body: fd });
      if (res.ok) {
        notify(t('pricing.paymentModal.success'), 'success');
        setShowPaymentModal(false);
      } else {
        const data = await res.json();
        notify(data.message || t('pricing.paymentModal.error'), 'error');
      }
    } catch {
      notify(t('pricing.paymentModal.error'), 'error');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    setPaymentFile(e.target.files[0] || null);
  };

  const hasActiveSub = subscription?.status === 'active' && new Date(subscription.endDate ?? 0) > new Date();

  return (
    <div className="page-teal">
      <div className="pricing-page">
        {hasActiveSub && (
          <div style={{ textAlign: 'center', padding: '16px', background: '#dcfce7', borderRadius: 12, marginBottom: 24, color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>
            &#10003; {t('pricing.activeSub', { name: subscription.planName, date: formatDate(subscription.endDate, lang) })}
          </div>
        )}

        <div className="pricing-redeem-section">
          <div className="pricing-redeem-icon">&#127934;</div>
          <h2 className="pricing-redeem-title">{t('pricing.redeemTitle')}</h2>
          <p className="pricing-redeem-desc">{t('pricing.redeemDesc')}</p>
          <div className="pricing-redeem-input-row">
            <input
              type="text"
              className="pricing-redeem-input"
              placeholder={t('pricing.redeemPlaceholder')}
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
              disabled={redeeming}
            />
            <button className="pricing-redeem-btn" onClick={handleRedeem} disabled={redeeming || !redeemCode.trim()}>
              {redeeming ? '...' : t('pricing.redeemBtn')}
            </button>
          </div>
          {redeemError && <p className="pricing-redeem-error">{redeemError}</p>}
        </div>

        <div className="pricing-divider">{t('pricing.or')}</div>

        {!userDiscipline || !userYear ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--dc-text-muted)', fontSize: '0.9rem' }}>
            {t('pricing.setProfile')}
            <br />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => navigate('/profile')}>{t('pricing.goProfile')}</button>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--dc-text-muted)' }}>{t('pricing.loadingPlans')}</div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--dc-text-muted)', fontSize: '0.9rem' }}>
            {t('pricing.noPlans')}
            <br />
            <span style={{ fontSize: '0.8rem' }}>{t('pricing.contactAdminHint')}</span>
          </div>
        ) : (
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan._id} className="pricing-card">
                <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>&#11088;</div>
                <h3 className="pricing-card-name">{plan.name}</h3>
                <p className="pricing-card-meta">
                  {plan.discipline === 'medicine' ? t('pricing.medicine') : t('pricing.pharmacy')} {t('pricing.year', { n: plan.year })} &mdash; {plan.interval === 'day' ? t('pricing.interval.daily') : plan.interval === 'week' ? t('pricing.interval.weekly') : plan.interval === 'month' ? t('pricing.interval.monthly') : plan.interval === 'semester' ? t('pricing.interval.semester') : plan.interval === 'year' ? t('pricing.interval.yearly') : plan.interval}
                </p>

                <div className="pricing-card-price">{plan.price === 0 ? t('pricing.free') : `${plan.price} €`}</div>

                <ul className="pricing-card-features">
                  <li className={`pricing-card-feature ${plan.included?.quizzes ? 'included' : 'excluded'}`}>
                    {plan.included?.quizzes ? '&#10003;' : '&#8212;'} {t('pricing.quizzes')}
                  </li>
                  <li className={`pricing-card-feature ${plan.included?.voiceExams ? 'included' : 'excluded'}`}>
                    {plan.included?.voiceExams ? '&#10003;' : '&#8212;'} {t('pricing.oralExams')}
                  </li>
                </ul>

                {plan.price === 0 ? (
                  <button className="pricing-card-btn" onClick={() => handleFreeSubscribe(plan)} disabled={subscribingId === plan._id}>
                    {subscribingId === plan._id ? t('pricing.activating') : t('pricing.subscribeFree')}
                  </button>
                ) : (
                  <button className="pricing-card-btn" onClick={() => handlePaidSubscribe(plan)}>
                    {t('pricing.subscribe')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {showPaymentModal && selectedPlan && (
          <div className="ecos-overlay" onClick={() => !paymentSubmitting && setShowPaymentModal(false)}>
            <div className="ecos-modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{t('pricing.paymentModal.title')}</h3>
                <button onClick={() => setShowPaymentModal(false)} disabled={paymentSubmitting}
                  style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>&times;</button>
              </div>

              <p style={{ fontSize: '0.9rem', marginBottom: 4 }}><strong>{selectedPlan.name}</strong></p>
              <p style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12, color: 'var(--dc-accent)' }}>{selectedPlan.price} €</p>

              {paymentInfo.instructions && (
                <div style={{ background: 'var(--dc-cream)', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                  {paymentInfo.instructions}
                </div>
              )}

              {paymentInfo.imageUrl && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img src={paymentInfo.imageUrl} alt="Bank transfer info"
                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid var(--dc-border)' }} />
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                {t('pricing.paymentModal.uploadLabel')}
              </label>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*"
                disabled={paymentSubmitting}
                style={{ marginBottom: 12, fontSize: '0.85rem' }} />

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
                {t('pricing.paymentModal.messageLabel')}
              </label>
              <textarea value={paymentMessage} onChange={(e) => setPaymentMessage(e.target.value)}
                disabled={paymentSubmitting}
                rows={3}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--dc-border)', fontSize: '0.85rem', resize: 'vertical' }} />

              <div className="ecos-modal-actions" style={{ marginTop: 16 }}>
                <button className="btn-ghost" onClick={() => setShowPaymentModal(false)} disabled={paymentSubmitting}>
                  {t('cancel')}
                </button>
                <button className="btn-primary" onClick={handlePaymentSubmit}
                  disabled={paymentSubmitting || !paymentMessage.trim()}>
                  {paymentSubmitting ? t('pricing.paymentModal.sending') : t('pricing.paymentModal.submit')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
