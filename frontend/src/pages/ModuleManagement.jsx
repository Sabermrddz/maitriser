import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { FaTrash, FaEdit, FaFilePdf } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useTranslation } from '../context/LanguageContext';
import '../styles/sharedAdmin.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];

const ModuleManagement = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.module.title'), 'Admin');
  const notify = useToast();
  const play = useSound();
  const [modules, setModules]       = useState([]);
  const [filterYear, setFilterYear] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [name, setName]             = useState('');
  const [year, setYear]             = useState('');
  const [discipline, setDiscipline] = useState('medicine');
  const [courses, setCourses]       = useState([]);
  const [editId, setEditId]         = useState(null);
  const [showCourseInput, setShowCourseInput] = useState(false);
  const [newCourse, setNewCourse]   = useState('');
  const [pdfDocs, setPdfDocs]       = useState([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchModules = async () => {
    const params = new URLSearchParams();
    if (filterYear) params.set('year', filterYear);
    if (filterDiscipline) params.set('discipline', filterDiscipline);
    const url = '/api/modules' + (params.toString() ? `?${params}` : '');
    try {
      setLoading(true);
      const res  = await authFetch(url);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (Array.isArray(data)) setModules(data);
      else setModules([]);
      setError('');
    } catch (e) { logger.error({ err: e }, 'ModuleManagement fetchModules failed'); setModules([]); setError(t('admin.module.networkError')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchModules(); }, [filterYear, filterDiscipline]);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch('/api/pdf-documents');
        if (res.ok) setPdfDocs(await res.json());
      } catch { /* ignore */ }
    })();
  }, []);

  const getCourseName = (c) => (typeof c === 'string' ? c : c.name || '');
  const getCoursePdfId = (c) => (typeof c === 'string' ? '' : c.pdfId || '');

  const removeCourse = (idx) => setCourses((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    play('submit');
    if (submittingRef.current) return;
    if (!name || !year) return notify(t('admin.module.fillRequired'), 'warning');
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const method = editId ? 'PUT' : 'POST';
      const url    = editId ? `/api/modules/${editId}` : '/api/modules';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, year: Number(year), courses, discipline }),
      });
      if (res.ok) { fetchModules(); resetForm(); notify(editId ? t('admin.module.updated') : t('admin.module.created'), 'success'); }
      else notify(t('admin.module.operationFailed'), 'error');
    } catch (err) {
      logger.error({ err }, 'ModuleManagement handleSubmit failed');
      notify(t('admin.module.networkError'), 'error');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  const confirmDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/modules/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { fetchModules(); notify(t('admin.module.deleted'), 'success'); }
      else notify(t('admin.module.deleteFailed'), 'error');
    } catch (err) {
      logger.error({ err }, 'ModuleManagement confirmDelete failed');
      notify(t('admin.module.networkError'), 'error');
    }
    setDeleteTarget(null);
    submittingRef.current = false;
    setSubmitting(false);
  };

  const startEdit = (mod) => {
    setEditId(mod._id);
    setName(mod.name);
    setYear(String(mod.year));
    setDiscipline(mod.discipline || 'medicine');
    setCourses((mod.courses || []).map((c) => typeof c === 'string' ? { name: c, pdfId: '' } : c));
    setShowCourseInput(false);
    setNewCourse('');
  };

  const resetForm = () => { setName(''); setYear(''); setDiscipline('medicine'); setCourses([]); setNewCourse(''); setShowCourseInput(false); setEditId(null); };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setCsvImporting(true);
      const res    = await authFetch('/api/import-modules-csv', { method: 'POST', body: formData });
      const result = res.ok ? await res.json() : null;
      notify(result?.message || t('admin.module.importDone'), res.ok ? 'success' : 'error');
      fetchModules();
    } catch (err) { logger.error({ err }, 'ModuleManagement CSV import failed'); notify(t('admin.module.networkError'), 'error'); }
    finally { setCsvImporting(false); e.target.value = ''; }
  };

  if (loading) return <div className="admin-page"><h2>{t('admin.module.title')}</h2><Spinner /></div>;

  const disciplines = [
    { value: '', label: t('admin.module.allDisciplines') },
    { value: 'medicine', label: t('admin.module.medicine') },
    { value: 'pharmacy', label: t('admin.module.pharmacy') },
  ];

  return (
    <div className="admin-page">
      <h2>{t('admin.module.title')}</h2>

      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="csv-import-bar">
        <strong>{t('admin.module.importCSV')}</strong>
        <input type="file" accept=".csv" onChange={handleCSVImport} disabled={csvImporting} />
        {csvImporting && <span style={{ color: 'var(--dc-accent)', fontStyle: 'italic' }}>{t('admin.module.importing')}</span>}
      </div>

      <div className="admin-form-card">
        <h3>{editId ? t('admin.module.editModule') : t('admin.module.addModule')}</h3>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input type="text" placeholder={t('admin.module.nameLabel')} value={name} onChange={(e) => setName(e.target.value)} />
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value)}>
            {disciplines.filter(d => d.value).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="">{t('admin.module.selectYear')}</option>
            {YEARS.map((y) => <option key={y} value={y}>{t('admin.module.yearOption', { y })}</option>)}
          </select>

          <div>
            <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: 4 }}>{t('admin.module.courses')}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {courses.map((c, i) => {
                const cName = getCourseName(c);
                const cPdfId = getCoursePdfId(c);
                const pdfDoc = pdfDocs.find((d) => d.pdfId === cPdfId);
                return (
                  <span key={i} className="year-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px' }}>
                    <span>{cName}</span>
                    <select
                      value={cPdfId}
                      onChange={(e) => setCourses((prev) => prev.map((cc, ii) => ii === i ? { name: getCourseName(cc), pdfId: e.target.value } : cc))}
                      style={{ fontSize: '0.75rem', padding: '2px 4px', maxWidth: 120 }}
                      title={t('admin.module.selectPdf')}
                    >
                      <option value="">—</option>
                      {pdfDocs.map((d) => <option key={d.pdfId} value={d.pdfId}>{d.pdfId} — {d.name}</option>)}
                    </select>
                    {pdfDoc && (
                      <button onClick={async () => {
                        try {
                          const res = await authFetch(`/api/course-pdfs/${encodeURIComponent(pdfDoc.filename)}`);
                           if (res.ok) { const { url } = await res.json(); window.open(url, '_blank', 'noopener,noreferrer'); }
                        } catch { notify(t('admin.module.networkError'), 'error'); }
                      }} style={{ color: 'var(--dc-accent)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} title={pdfDoc.name}>
                        <FaFilePdf />
                      </button>
                    )}
                    <button type="button" onClick={() => removeCourse(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-highlight)', fontSize: '0.8rem', padding: 0 }}>&times;</button>
                  </span>
                );
              })}
              {courses.length === 0 && !showCourseInput && <span style={{ color: 'var(--dc-text-muted)', fontSize: '0.85rem' }}>{t('admin.module.noCourses')}</span>}
              {showCourseInput ? (
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  <input type="text" value={newCourse} onChange={(e) => setNewCourse(e.target.value)} placeholder={t('admin.module.courses')} style={{ width: 120 }} onKeyDown={(e) => { if (e.key === 'Escape') { setShowCourseInput(false); setNewCourse(''); } }} />
                  <button type="button" onClick={() => { const c = newCourse.trim(); if (!c) return; if (courses.some((cc) => getCourseName(cc) === c)) notify(t('admin.module.courseAlreadyAdded'), 'warning'); else { setCourses((prev) => [...prev, { name: c, pdfId: '' }]); setNewCourse(''); setShowCourseInput(false); } }} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}>OK</button>
                  <button type="button" onClick={() => { setShowCourseInput(false); setNewCourse(''); }} style={{ padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--dc-text-muted)' }}>X</button>
                </span>
              ) : (
                <button type="button" onClick={() => setShowCourseInput(true)} style={{ padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer', border: '1px dashed var(--dc-accent-light)', borderRadius: 14, background: 'transparent', color: 'var(--dc-accent)' }}>{t('admin.module.addCourse')}</button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={submitting}>{editId ? t('admin.module.update') : t('admin.module.addModule')}</button>
            {editId && <button type="button" onClick={resetForm}>{t('admin.module.cancel')}</button>}
          </div>
        </form>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold', color: 'var(--dc-dark)' }}>{t('admin.module.filter')}</label>
        <select value={filterDiscipline} onChange={(e) => setFilterDiscipline(e.target.value)}>
          {disciplines.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">{t('admin.module.allYears')}</option>
          {YEARS.map((y) => <option key={y} value={y}>{t('admin.module.yearOption', { y })}</option>)}
        </select>
      </div>

      {['medicine', 'pharmacy'].map((disc) => {
        const discModules = modules.filter((m) => (m.discipline || 'medicine') === disc);
        if (discModules.length === 0) return null;
        const discLabel = disc === 'pharmacy' ? t('admin.module.pharmacy') : t('admin.module.medicine');
        const discColor = disc === 'pharmacy' ? '#8e44ad' : '#0e7c86';
        return (
          <div key={disc} style={{ marginBottom: 26 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: `3px solid ${discColor}`, paddingBottom: 6, color: discColor, marginBottom: 12 }}>
              <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: 14, fontSize: '0.85rem', fontWeight: 700, color: '#fff', background: discColor }}>{discLabel}</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--dc-text-muted)', fontWeight: 400 }}>{t('admin.module.modulesCount', { count: discModules.length })}</span>
            </h3>
            {YEARS.filter((y) => !filterYear || Number(filterYear) === y).map((y) => {
              const yearly = discModules.filter((m) => m.year === y);
              if (yearly.length === 0) return null;
              return (
                <div key={y} style={{ marginBottom: 16 }}>
                  <h4 style={{ borderBottom: '2px solid var(--dc-accent)', paddingBottom: 4, color: 'var(--dc-accent)' }}>{t('admin.module.yearHeading', { y })}</h4>
                  <div className="admin-table-wrapper">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>{t('admin.module.tableName')}</th>
                          <th>{t('admin.module.tableCourses')}</th>
                          <th>{t('admin.module.tableActions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearly.map((mod) => (
                          <tr key={mod._id}>
                            <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>{mod.name}</td>
                            <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                              {(mod.courses || []).length > 0 ? mod.courses.map((c) => typeof c === 'string' ? c : c.name || '').join(', ') : '—'}
                            </td>
                            <td style={{ padding: 8, borderBottom: '1px solid var(--dc-border)' }}>
                              <button onClick={() => startEdit(mod)} style={{ marginRight: 8 }}><FaEdit /></button>
                              <button onClick={() => setDeleteTarget(mod)}><FaTrash /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
      {modules.length === 0 && !loading && <p style={{ color: 'var(--dc-text-muted)' }}>{t('admin.module.empty')}</p>}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('admin.module.deleteConfirm')}
        message={t('admin.module.deleteConfirmMsg', { name: deleteTarget?.name || '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText={t('admin.module.deleteBtn')}
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default ModuleManagement;
