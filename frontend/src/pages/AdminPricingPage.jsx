import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { authFetch } from '../config/authFetch';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/adminPricing.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const emptyPlan = () => ({
  name: '', discipline: 'medicine', year: 1, price: 0,
  included: { quizzes: true, voiceExams: false },
  interval: 'month', isActive: true, sortOrder: 0,
});

const AdminPricingPage = () => {
  const notify = useToast();
  const play = useSound();
  const { t, lang } = useTranslation();
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [planForm, setPlanForm] = useState(emptyPlan());
  const [editPlanId, setEditPlanId] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genPlanId, setGenPlanId] = useState('');
  const [genCount, setGenCount] = useState(5);
  const [genExpiry, setGenExpiry] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [genResult, setGenResult] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [dailyCount, setDailyCount] = useState(5);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailySaving, setDailySaving] = useState(false);
  const [payInstructions, setPayInstructions] = useState('');
  const [payImageUrl, setPayImageUrl] = useState('');
  const [payConfigLoading, setPayConfigLoading] = useState(false);
  const [payConfigSaving, setPayConfigSaving] = useState(false);
  const [payIntents, setPayIntents] = useState([]);
  const [payIntentsLoading, setPayIntentsLoading] = useState(false);
  const [payIntentsPage, setPayIntentsPage] = useState(1);
  const [payIntentsTotal, setPayIntentsTotal] = useState(0);
  const [confirm, setConfirm] = useState({ open: false, title: '', message: '', onConfirm: null });

  useDocumentTitle(t('admin.pricing.title'), 'Admin');
  useEffect(() => { fetchPlans(); }, []);

  const genTimer = useRef(null);
  useEffect(() => {
    if (genPlanId && genCount >= 1 && showGenModal) {
      if (genTimer.current) clearTimeout(genTimer.current);
      genTimer.current = setTimeout(() => autoGenerate(), 400);
    }
    return () => { if (genTimer.current) clearTimeout(genTimer.current); };
  }, [genPlanId, genCount, showGenModal]);

  const autoGenerate = async () => {
    setGenerating(true);
    try {
      const res = await authFetch('/api/admin/subscription-codes/generate', {
        method: 'POST',
        body: { planId: genPlanId, count: genCount, expiresAt: genExpiry || null, notes: genNotes },
      });
      if (res.ok) {
        const data = await res.json();
        setGenResult(data.codes || []);
        fetchCodes();
      }       else { const d = await res.json(); notify(d.message || t('admin.pricing.error'), 'error'); }
    } catch { notify(t('admin.pricing.networkError'), 'error'); }
    finally { setGenerating(false); }
  };

  const fetchPlans = async () => {
    try {
      const res = await authFetch('/api/admin/plans');
      if (res.ok) setPlans(await res.json());
    } catch { notify(t('admin.pricing.loadPlansFailed'), 'error'); }
    setLoading(false);
  };

  const fetchCodes = async () => {
    try {
      const res = await authFetch('/api/admin/subscription-codes');
      if (res.ok) setCodes(await res.json());
    } catch { notify(t('admin.pricing.loadCodesFailed'), 'error'); }
  };

  useEffect(() => { if (tab === 'codes') fetchCodes(); }, [tab]);
  useEffect(() => { if (tab === 'daily') { setDailyLoading(true); fetchDailyConfig(); } }, [tab]);
  useEffect(() => { if (tab === 'payment') { fetchPaymentConfig(); fetchPaymentIntents(); } }, [tab]);

  const fetchDailyConfig = async () => {
    try {
      const res = await authFetch('/api/admin/daily-config');
      if (res.ok) { const data = await res.json(); setDailyCount(Number(data.value) || 5); }
    } catch { notify(t('admin.pricing.loadDailyFailed'), 'error'); }
    finally { setDailyLoading(false); }
  };

  const handleSaveDailyConfig = async () => {
    setDailySaving(true);
    play('submit');
    try {
      const res = await authFetch('/api/admin/daily-config', { method: 'PUT', body: { value: dailyCount } });
      if (res.ok) { notify(t('admin.pricing.dailyUpdated'), 'success'); }
      else { const d = await res.json(); notify(d.message || t('admin.pricing.error'), 'error'); }
    } catch { notify(t('admin.pricing.networkError'), 'error'); }
    finally { setDailySaving(false); }
  };

  const fetchPaymentConfig = async () => {
    setPayConfigLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/payments/payment-info`);
      if (res.ok) { const data = await res.json(); setPayInstructions(data.instructions || ''); setPayImageUrl(data.imageUrl || ''); }
    } catch { /* ignore */ }
    finally { setPayConfigLoading(false); }
  };

  const handleSavePaymentConfig = async () => {
    setPayConfigSaving(true);
    play('submit');
    try {
      const res = await authFetch('/api/admin/payment-config', {
        method: 'PUT', body: { instructions: payInstructions, imageUrl: payImageUrl },
      });
      if (res.ok) { notify(t('admin.pricing.paymentSaved'), 'success'); }
      else { const d = await res.json(); notify(d.message || t('admin.pricing.error'), 'error'); }
    } catch { notify(t('admin.pricing.networkError'), 'error'); }
    finally { setPayConfigSaving(false); }
  };

  const fetchPaymentIntents = async (page = 1) => {
    setPayIntentsLoading(true);
    try {
      const res = await authFetch(`/api/admin/payment-intents?page=${page}&limit=20`);
      if (res.ok) { const data = await res.json(); setPayIntents(data.data || []); setPayIntentsTotal(data.total || 0); setPayIntentsPage(data.page || 1); }
    } catch { /* ignore */ }
    finally { setPayIntentsLoading(false); }
  };

  const handleDeleteIntent = async (id) => {
    setConfirm({ open: true, title: t('admin.pricing.deleteIntentConfirm'), message: '', onConfirm: async () => {
      setConfirm(c => ({ ...c, open: false }));
      play('delete');
      try {
        const res = await authFetch(`/api/admin/payment-intents/${id}`, { method: 'DELETE' });
        if (res.ok) { notify(t('admin.pricing.intentDeleted'), 'success'); fetchPaymentIntents(payIntentsPage); }
        else notify(t('admin.pricing.deleteFailed'), 'error');
      } catch { notify(t('admin.pricing.networkError'), 'error'); }
    }});
  };

  const openEditPlan = (plan) => {
    setEditPlanId(plan._id);
    setPlanForm({
      name: plan.name || '',
      discipline: plan.discipline || 'medicine',
      year: plan.year || 1,
      price: plan.price ?? 0,
      included: { ...{ quizzes: true, voiceExams: false }, ...plan.included },
      interval: plan.interval || 'month',
      isActive: plan.isActive !== false,
      sortOrder: plan.sortOrder || 0,
    });
    setShowPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) return notify(t('admin.pricing.nameRequired'), 'warning');
    setSaving(true);
    play('submit');
    try {
      const url = editPlanId ? `/api/admin/plans/${editPlanId}` : '/api/admin/plans';
      const method = editPlanId ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: planForm });
      if (res.ok) { notify(editPlanId ? t('admin.pricing.planUpdated') : t('admin.pricing.planCreated'), 'success'); setShowPlanModal(false); fetchPlans(); }
      else { const d = await res.json(); notify(d.message || t('admin.pricing.error'), 'error'); }
    } catch { notify(t('admin.pricing.networkError'), 'error'); }
    finally { setSaving(false); }
  };

  const handleDeletePlan = async (id) => {
    setConfirm({ open: true, title: t('admin.pricing.deletePlanConfirm'), message: t('admin.pricing.deletePlanMsg'), onConfirm: async () => {
      setConfirm(c => ({ ...c, open: false }));
      play('delete');
      try {
        const res = await authFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
        if (res.ok) { notify(t('admin.pricing.planDeleted'), 'success'); fetchPlans(); }
        else notify(t('admin.pricing.deleteFailed'), 'error');
      } catch { notify(t('admin.pricing.networkError'), 'error'); }
    }});
  };

  const handleRevokeCode = async (id) => {
    setConfirm({ open: true, title: t('admin.pricing.revokeCodeConfirm'), message: t('admin.pricing.revokeCodeMsg'), onConfirm: async () => {
      setConfirm(c => ({ ...c, open: false }));
      play('delete');
      try {
        const res = await authFetch(`/api/admin/subscription-codes/${id}`, { method: 'DELETE' });
        if (res.ok) { notify(t('admin.pricing.codeRevoked'), 'success'); fetchCodes(); }
        else notify(t('admin.pricing.revokeFailed'), 'error');
      } catch { notify(t('admin.pricing.networkError'), 'error'); }
    }});
  };

  const copyCode = (code) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard?.writeText(code);
      notify(t('admin.pricing.copied'), 'success');
    }
  };

  return (
    <div className="admin-page">
      <h2>{t('admin.pricing.title')}</h2>

      <div className="admin-tabs">
        <button className={`admin-tab ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>{t('admin.pricing.tabPlans')}</button>
        <button className={`admin-tab ${tab === 'codes' ? 'active' : ''}`} onClick={() => setTab('codes')}>{t('admin.pricing.tabCodes')}</button>
        <button className={`admin-tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>{t('admin.pricing.tabDaily')}</button>
        <button className={`admin-tab ${tab === 'payment' ? 'active' : ''}`} onClick={() => setTab('payment')}>{t('admin.pricing.tabPayment')}</button>
      </div>

      {tab === 'plans' && (
        <>
          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => { setEditPlanId(null); setPlanForm(emptyPlan()); setShowPlanModal(true); }}>
            {t('admin.pricing.createPlan')}
          </button>

          {loading ? <Spinner text={t('admin.pricing.loadPlans')} /> : plans.length === 0 ? (
            <div className="admin-empty">{t('admin.pricing.noPlans')}</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.pricing.colName')}</th>
                    <th>{t('admin.pricing.colDiscipline')}</th>
                    <th>{t('admin.pricing.colYear')}</th>
                    <th>{t('admin.pricing.colPrice')}</th>
                    <th>{t('admin.pricing.colIncluded')}</th>
                    <th>{t('admin.pricing.colInterval')}</th>
                    <th>{t('admin.pricing.colActive')}</th>
                    <th>{t('admin.pricing.colSort')}</th>
                    <th>{t('admin.pricing.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p._id}>
                      <td>{p.name}</td>
                      <td style={{ textTransform: 'capitalize' }}>{p.discipline}</td>
                      <td>Y{p.year}</td>
                      <td>{p.price === 0 ? t('admin.pricing.free') : p.price}</td>
                      <td style={{ fontSize: '0.78rem' }}>
                        Q:{p.included?.quizzes ? '&#10003;' : '&#8212;'} V:{p.included?.voiceExams ? '&#10003;' : '&#8212;'}
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{p.interval}</td>
                      <td>{p.isActive ? '&#10003;' : '&#8212;'}</td>
                      <td>{p.sortOrder}</td>
                      <td>
                        <button onClick={() => openEditPlan(p)} style={{ marginRight: 6 }}>&#9998;</button>
                        <button onClick={() => handleDeletePlan(p._id)}>&#128465;</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showPlanModal && (
            <div className="modal-overlay" onClick={() => !saving && setShowPlanModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <h3>{editPlanId ? t('admin.pricing.editPlan') : t('admin.pricing.createPlanTitle')}</h3>

                <label>{t('admin.pricing.labelName')}</label>
                <input type="text" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} disabled={saving} />

                <label>{t('admin.pricing.labelDiscipline')}</label>
                <select value={planForm.discipline} onChange={(e) => setPlanForm({ ...planForm, discipline: e.target.value })} disabled={saving}>
                  <option value="medicine">{t('admin.pricing.labelDiscipline') === 'Discipline' ? 'Medicine' : 'Médecine'}</option>
                  <option value="pharmacy">{t('admin.pricing.labelDiscipline') === 'Discipline' ? 'Pharmacy' : 'Pharmacie'}</option>
                </select>

                <label>{t('admin.pricing.labelYear')}</label>
                <select value={planForm.year} onChange={(e) => setPlanForm({ ...planForm, year: Number(e.target.value) })} disabled={saving}>
                  {YEARS.map((y) => <option key={y} value={y}>{t('pricing.year', { n: y })}</option>)}
                </select>

                <label style={{ marginTop: 12, display: 'block', fontWeight: 600, fontSize: '0.85rem' }}>{t('admin.pricing.labelIncluded')}</label>
                <div style={{ display: 'flex', gap: 16, margin: '6px 0 12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={planForm.included.quizzes} onChange={(e) => setPlanForm({ ...planForm, included: { ...planForm.included, quizzes: e.target.checked } })} disabled={saving} />
                    {t('admin.pricing.includedQuizzes')}
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input type="checkbox" checked={planForm.included.voiceExams} onChange={(e) => setPlanForm({ ...planForm, included: { ...planForm.included, voiceExams: e.target.checked } })} disabled={saving} />
                    {t('admin.pricing.includedOral')}
                  </label>
                </div>

                <label>{t('admin.pricing.labelPrice')}</label>
                <input type="number" min="0" step="0.01" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) })} disabled={saving} />

                <label>{t('admin.pricing.labelInterval')}</label>
                <select value={planForm.interval} onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })} disabled={saving}>
                  <option value="day">{t('admin.pricing.intervalDay')}</option>
                  <option value="week">{t('admin.pricing.intervalWeek')}</option>
                  <option value="month">{t('admin.pricing.intervalMonth')}</option>
                  <option value="semester">{t('admin.pricing.intervalSemester')}</option>
                  <option value="bimonth">{t('admin.pricing.intervalBimonth')}</option>
                  <option value="year">{t('admin.pricing.intervalYear')}</option>
                </select>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label>{t('admin.pricing.labelSortOrder')}</label>
                    <input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm({ ...planForm, sortOrder: Number(e.target.value) })} disabled={saving} />
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input type="checkbox" checked={planForm.isActive} onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })} disabled={saving} />
                      {t('admin.pricing.labelActive')}
                    </label>
                  </div>
                </div>

                <div className="modal-buttons">
                  <button onClick={() => setShowPlanModal(false)} disabled={saving}>{t('cancel')}</button>
                  <button onClick={handleSavePlan} disabled={saving}>{saving ? t('loading') : (editPlanId ? t('admin.mockExam.update') : t('admin.quiz.createCaseBtn'))}</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'codes' && (
        <>
          <button className="btn-primary" style={{ marginBottom: 16 }} onClick={() => { setGenPlanId(''); setGenCount(5); setGenExpiry(''); setGenNotes(''); setGenResult(null); setShowGenModal(true); }}>
            {t('admin.pricing.generateCodes')}
          </button>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('admin.pricing.colCode')}</th>
                  <th>{t('admin.pricing.colName')}</th>
                  <th>{t('admin.pricing.colStatus')}</th>
                  <th>{t('admin.pricing.colUsedBy')}</th>
                  <th>{t('admin.pricing.colUsedAt')}</th>
                  <th>{t('admin.pricing.colExpires')}</th>
                  <th>{t('admin.pricing.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {codes.length === 0 ? (
                  <tr><td colSpan="7" className="admin-empty">{t('admin.pricing.noCodes')}</td></tr>
                ) : codes.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.5px' }}>{c.code}</td>
                    <td>{c.planId?.name || '—'}</td>
                    <td>
                      <span className={`code-status ${c.status ? `code-status-${c.status}` : ''}`}>{c.status || '—'}</span>
                    </td>
                    <td>{c.usedBy?.name || c.usedBy?.email || '—'}</td>
                    <td>{c.usedAt ? formatDate(c.usedAt, lang) : '—'}</td>
                    <td>{c.expiresAt ? formatDate(c.expiresAt, lang) : '—'}</td>
                    <td>
                      {c.status === 'active' && <button onClick={() => handleRevokeCode(c._id)}>&#128465;</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showGenModal && (
            <div className="modal-overlay" onClick={() => !generating && setShowGenModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                <h3>{t('admin.pricing.genTitle')}</h3>
                <label>{t('admin.pricing.genPlan')}</label>
                <select value={genPlanId} onChange={(e) => { setGenPlanId(e.target.value); setGenResult(null); }} disabled={generating}>
                  <option value="">{t('admin.pricing.genSelectPlan')}</option>
                  {plans.map((p) => <option key={p._id} value={p._id}>{p.name} — {p.discipline} Y{p.year}</option>)}
                </select>
                <label>{t('admin.pricing.genCount')}</label>
                <input type="number" min="1" max="100" value={genCount} onChange={(e) => { setGenCount(Number(e.target.value)); setGenResult(null); }} disabled={generating} />
                <label>{t('admin.pricing.genExpiry')}</label>
                <input type="date" value={genExpiry} onChange={(e) => setGenExpiry(e.target.value)} disabled={generating} />
                <label>{t('admin.pricing.genNotes')}</label>
                <input type="text" value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder={t('admin.pricing.genNotesPlaceholder')} disabled={generating} />

                {generating && <p style={{ textAlign: 'center', color: 'var(--dc-text-muted)', margin: '12px 0' }}>{t('admin.pricing.genGenerating')}</p>}

                {genResult && genResult.length > 0 && (
                  <>
                    <div style={{ maxHeight: 300, overflowY: 'auto', margin: '12px 0' }}>
                      {genResult.map((code, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f8f8f8', borderRadius: 6, marginBottom: 4, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          <span>&#128196; {code}</span>
                          <button onClick={() => copyCode(code)} style={{ padding: '4px 10px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: '0.75rem' }}>Copy</button>
    </div>
                      ))}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--dc-text-muted)', textAlign: 'center' }}>{t('admin.pricing.genAutoNote')}</p>
                  </>
                )}

                <div className="modal-buttons">
                  <button onClick={() => setShowGenModal(false)} disabled={generating}>Close</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'daily' && (
        <div className="admin-card" style={{ maxWidth: 500, marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{t('admin.pricing.dailyTitle')}</h3>
          {dailyLoading ? (
            <Spinner text={t('admin.pricing.loadPlans')} />
          ) : (
            <>
              <p style={{ fontSize: '0.85rem', color: 'var(--dc-text-muted)', marginBottom: 12 }}>
                {t('admin.pricing.dailyDesc')}
              </p>
              <label>{t('admin.pricing.dailyLabel')}</label>
              <input
                type="number" min="1" max="50"
                value={dailyCount}
                onChange={(e) => setDailyCount(Math.max(1, Number(e.target.value)))}
                disabled={dailySaving}
                style={{ marginBottom: 12 }}
              />
              <button className="btn-primary" onClick={handleSaveDailyConfig} disabled={dailySaving}>
                {dailySaving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      )}

      {tab === 'payment' && (
        <div className="admin-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>{t('admin.pricing.paymentConfigTitle')}</h3>
          {payConfigLoading ? (
            <Spinner text={t('admin.pricing.loadPlans')} />
          ) : (
            <>
              <label style={{ display: 'block', marginBottom: 4 }}>{t('admin.pricing.paymentInstructionsLabel')}</label>
              <textarea value={payInstructions} onChange={(e) => setPayInstructions(e.target.value)}
                disabled={payConfigSaving} rows={4}
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--dc-border)', fontSize: '0.85rem', resize: 'vertical', marginBottom: 12 }} />

              <label style={{ display: 'block', marginBottom: 4 }}>{t('admin.pricing.paymentImageLabel')}</label>
              <input type="text" value={payImageUrl} onChange={(e) => setPayImageUrl(e.target.value)}
                disabled={payConfigSaving} placeholder="https://..."
                style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid var(--dc-border)', fontSize: '0.85rem', marginBottom: 12 }} />
              {payImageUrl && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <img src={payImageUrl} alt="Baridimob info preview"
                    style={{ maxWidth: '100%', maxHeight: 150, borderRadius: 6, border: '1px solid var(--dc-border)' }} />
                </div>
              )}

              <button className="btn-primary" onClick={handleSavePaymentConfig} disabled={payConfigSaving}>
                {payConfigSaving ? '...' : t('admin.pricing.paymentSaveBtn')}
              </button>
            </>
          )}

          <h3 style={{ margin: '24px 0 12px' }}>{t('admin.pricing.paymentIntents')}</h3>
          {payIntentsLoading ? (
            <Spinner text={t('admin.pricing.loadPlans')} />
          ) : payIntents.length === 0 ? (
            <div className="admin-empty">{t('admin.pricing.noIntents')}</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.pricing.colUser')}</th>
                    <th>{t('admin.pricing.colPlan')}</th>
                    <th>{t('admin.pricing.colMessage')}</th>
                    <th>{t('admin.pricing.colReceipt')}</th>
                    <th>{t('admin.pricing.colDate')}</th>
                    <th>{t('admin.pricing.colActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {payIntents.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--dc-text-muted)' }}>{item.email}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{item.planName || '—'}</td>
                      <td style={{ fontSize: '0.8rem', maxWidth: 200, wordBreak: 'break-word' }}>
                        {item.message?.replace(/\[Payment Intent\]/g, '').trim() || '—'}
                      </td>
                      <td>
                        {item.imageUrl ? (
                          <a href={`${API_BASE_URL}/api/payment-images/${item.imageUrl.split('/').pop()}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--dc-accent)', fontSize: '0.85rem' }}>
                            {t('admin.pricing.viewReceipt')}
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {item.createdAt ? formatDate(item.createdAt, lang) : '—'}
                      </td>
                      <td>
                        <button onClick={() => handleDeleteIntent(item._id)} style={{ color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.85rem' }}>
                          {t('admin.pricing.deleteIntent')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payIntentsTotal > 20 && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button className="btn-ghost" onClick={() => fetchPaymentIntents(payIntentsPage + 1)}>
                    {t('admin.pricing.loadMore')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />
    </div>
  );
};

export default AdminPricingPage;
