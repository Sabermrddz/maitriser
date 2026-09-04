import React, { useState, useEffect, useCallback, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { API_BASE_URL } from '../config/api';
import { FaTrash, FaEdit, FaSave, FaPaperPlane, FaCheck } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/QuizManagement.css';

const YEARS = [1, 2, 3, 4, 5, 6, 7];
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const emptyForm = () => ({
  discipline: '', selectedYear: '', moduleId: '', course: '',
  questionText: '',
  options: ['', '', '', ''], correctIndices: [],
  explanation: '',
  optionExplanations: [],  // [{letter, whyTrue, whyFalse}]
  keyConcepts: [],
  commonTraps: [],
  tags: [],
});

const OptionItem = ({ i, opt, onUpdate, isCorrect }) => {
  const [text, setText] = useState(opt);
  useEffect(() => { setText(opt); }, [opt]);

  const handleChange = (e) => {
    const v = e.target.value;
    setText(v);
    onUpdate(i, v);
  };

  return (
    <div className={`option-row${isCorrect ? ' correct' : ''}`}>
      <span className="option-letter">{LETTERS[i]}.</span>
      <input type="text" className="option-input" value={text} onChange={handleChange} placeholder={`Option ${LETTERS[i]}`} />
      {isCorrect && <span className="correct-badge"><FaCheck /></span>}
    </div>
  );
};

const QuizManagement = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.quiz.title'), 'Admin');
  const notify = useToast();
  const play = useSound();
  const [modules, setModules]               = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [quizzes, setQuizzes]               = useState([]);
  const [form, setForm]                     = useState(emptyForm());
  const [editId, setEditId]                 = useState(null);
  const [csvImporting, setCsvImporting]     = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterYear, setFilterYear]         = useState('');
  const [filterModule, setFilterModule]     = useState('');
  const [filterSearch, setFilterSearch]     = useState('');
  const [formKey, setFormKey]               = useState(0);
  const [moduleCourses, setModuleCourses]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState('');
  const [deleteTarget, setDeleteTarget]     = useState(null);
  const [page, setPage]                     = useState(1);
  const [totalPages, setTotalPages]         = useState(1);
  const [selectedIds, setSelectedIds]       = useState(new Set());
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState(null);
  const [bulkProcessing, setBulkProcessing]  = useState(false);
  const [showCaseModal, setShowCaseModal]   = useState(false);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [creatingCase, setCreatingCase]     = useState(false);
  const [questionImage, setQuestionImage]   = useState(null);
  const [imagePreview, setImagePreview]     = useState(null);
  const [removeImage, setRemoveImage]       = useState(false);
  const emptyQuiz = () => ({ questionText: '', options: ['', '', '', ''], correctIndices: [], explanation: '', optionExplanations: [], keyConcepts: [], commonTraps: [], tags: [] });
  const [caseForm, setCaseForm]             = useState({ year: '', moduleId: '', discipline: '', title: '', description: '', course: '', quizzes: [emptyQuiz(), emptyQuiz(), emptyQuiz()] });
  const [caseModuleCourses, setCaseModuleCourses] = useState([]);

  useEffect(() => { fetchModules(); fetchQuizzes(); }, [filterDiscipline]);

  useEffect(() => {
    return () => { if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  useEffect(() => {
    setFilteredModules(modules.filter((m) => {
      if (form.selectedYear && m.year !== Number(form.selectedYear)) return false;
      if (form.discipline && m.discipline !== form.discipline) return false;
      return true;
    }));
  }, [form.selectedYear, form.discipline, modules]);

  useEffect(() => {
    if (!form.moduleId) { setModuleCourses([]); return; }
    const mod = modules.find((m) => m._id === form.moduleId);
    if (mod) setModuleCourses(mod.courses || []);
    else {
      authFetch(`/api/modules`)
        .then((r) => r.ok ? r.json() : [])
        .then((all) => { if (Array.isArray(all)) { const found = all.find((m) => m._id === form.moduleId); if (found) setModuleCourses(found.courses || []); } })
        .catch((err) => { logger.error({ err }, 'QuizManagement moduleCourses fallback fetch failed'); });
    }
  }, [form.moduleId, modules]);

  useEffect(() => {
    if (!caseForm.moduleId) { setCaseModuleCourses([]); return; }
    const mod = modules.find((m) => m._id === caseForm.moduleId);
    if (mod) setCaseModuleCourses(mod.courses || []);
    else {
      authFetch('/api/modules')
        .then((r) => r.ok ? r.json() : [])
        .then((all) => { if (Array.isArray(all)) { const found = all.find((m) => m._id === caseForm.moduleId); if (found) setCaseModuleCourses(found.courses || []); } })
        .catch(() => { setCaseModuleCourses([]); });
    }
  }, [caseForm.moduleId, modules]);

  const fetchModules = async () => {
    try {
      const res = await authFetch('/api/modules');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setModules(Array.isArray(data) ? data : []);
    } catch (e) { logger.error({ err: e }, 'QuizManagement fetchModules failed'); setModules([]); }
  };

  const fetchQuizzes = async (p) => {
    const pg = p ?? page;
    let url = `/api/admin/quizzes?page=${pg}&limit=50`;
    if (filterDiscipline) url += `&discipline=${filterDiscipline}`;
    if (filterModule) url += `&moduleId=${filterModule}`;
    else if (filterYear) url += `&year=${filterYear}`;
    if (filterSearch) url += `&search=${encodeURIComponent(filterSearch)}`;
    try {
      setLoading(true);
      const res = await authFetch(url);
      if (!res.ok) throw new Error('Failed');
      const d = await res.json();
      setQuizzes(d.data || (Array.isArray(d) ? d : []));
      setPage(d.page || 1);
      setTotalPages(d.totalPages || 1);
      setError('');
    } catch (e) { logger.error({ err: e }, 'QuizManagement fetchQuizzes failed'); setError('Failed to load quizzes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchQuizzes(1); }, [filterDiscipline, filterYear, filterModule, filterSearch]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateOption = useCallback((i, val) => {
    setForm((f) => {
      const updated = f.options.map((o, idx) => idx === i ? val : o);
      return { ...f, options: updated };
    });
  }, []);

  const toggleCorrect = useCallback((idx, wantsCorrect) => {
    setForm((f) => {
      const has = f.correctIndices.includes(idx);
      if (wantsCorrect && !has) return { ...f, correctIndices: [...f.correctIndices, idx] };
      if (!wantsCorrect && has) return { ...f, correctIndices: f.correctIndices.filter((i) => i !== idx) };
      return f;
    });
  }, []);

  const handleSubmit = async (published) => {
    play('submit');
    if (submittingRef.current) return;
    const { moduleId, course, questionText, options, correctIndices, explanation, optionExplanations, keyConcepts, commonTraps, tags } = form;
    if (!moduleId || !questionText) return notify(t('admin.quiz.fillRequiredFields'), 'warning');
      if (options.some((o) => !o.trim())) return notify(t('admin.quiz.optionsMustHaveText'), 'warning');
      if (correctIndices.length === 0) return notify(t('admin.quiz.selectCorrectAnswer'), 'warning');

    const correctAnswers = correctIndices.map((i) => options[i]);
    const url    = editId ? `/api/quizzes/${editId}` : '/api/quizzes';
    const method = editId ? 'PUT' : 'POST';
    submittingRef.current = true;
    setSubmitting(true);

    try {
      let res;
      if (questionImage || (editId && removeImage)) {
        const fd = new FormData();
        fd.append('moduleId', moduleId);
        fd.append('questionText', questionText);
        fd.append('options', JSON.stringify(options));
        fd.append('correctAnswers', JSON.stringify(correctAnswers));
        fd.append('course', course || '');
        fd.append('published', String(published));
        fd.append('explanation', explanation || '');
        fd.append('optionExplanations', JSON.stringify(optionExplanations || []));
        fd.append('keyConcepts', JSON.stringify(keyConcepts || []));
        fd.append('commonTraps', JSON.stringify(commonTraps || []));
        fd.append('tags', JSON.stringify(tags || []));
        if (questionImage) fd.append('questionImage', questionImage);
        if (editId && removeImage) fd.append('removeImage', 'true');
        res = await authFetch(url, { method, body: fd });
      } else {
        const body = { moduleId, course: course || '', questionText, options, correctAnswers, explanation, optionExplanations: optionExplanations || [], keyConcepts: keyConcepts || [], commonTraps: commonTraps || [], tags: tags || [], published };
        res = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      const data = res.ok ? await res.json() : null;
      if (res.ok) { fetchQuizzes(); resetForm(); notify(editId ? t('admin.quiz.quizUpdated') : t('admin.quiz.quizCreated'), 'success'); }
      else notify(t('admin.quiz.error', { message: data?.message || t('admin.quiz.unknownError') }), 'error');
    } catch (err) {
      logger.error({ err }, 'QuizManagement handleSubmit failed');
      notify(t('admin.quiz.networkError'), 'error');
    } finally { submittingRef.current = false; setSubmitting(false); }
  };

  const confirmDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/quizzes/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { fetchQuizzes(); notify(t('admin.quiz.quizDeleted'), 'success'); }
      else notify(t('admin.quiz.deleteFailed'), 'error');
    } catch (err) {
      logger.error({ err }, 'QuizManagement confirmDelete failed');
      notify(t('admin.quiz.networkError'), 'error');
    }
    setDeleteTarget(null);
    submittingRef.current = false;
    setSubmitting(false);
  };

  const startEdit = (quiz) => {
    const opts = quiz.question?.options || ['', '', '', ''];
    const correctIndices = (quiz.question?.correctAnswers || [])
      .map((ans) => opts.findIndex((o) => o === ans))
      .filter((i) => i >= 0);
    const mod = modules.find((m) => (m._id === (quiz.moduleId?._id || quiz.moduleId)));
    if (mod) setModuleCourses(mod.courses || []);

    setEditId(quiz._id);
    setForm({
      discipline: quiz.discipline || '',
      selectedYear: String(quiz.year),
      moduleId: quiz.moduleId?._id || quiz.moduleId,
      course: quiz.course || '',
      questionText: quiz.question?.questionText || '',
      options: [...opts],
      correctIndices,
      explanation: quiz.explanation || quiz.question?.explanation || '',
      optionExplanations: quiz.optionExplanations || [],
      keyConcepts: quiz.keyConcepts || [],
      commonTraps: quiz.commonTraps || [],
      tags: quiz.tags || [],
    });
    if (quiz.question?.questionImage) {
      setImagePreview(`${API_BASE_URL}/api/quiz-images/${quiz.question.questionImage}`);
      setRemoveImage(false);
    } else {
      setImagePreview(null);
      setRemoveImage(false);
    }
    setQuestionImage(null);
    setFormKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => { setForm(emptyForm()); setEditId(null); setFormKey((k) => k + 1); setQuestionImage(null); setImagePreview(null); setRemoveImage(false); };

  const updateOptionExplanation = (letter, field, value) => {
    setForm((f) => {
      const existing = f.optionExplanations.find((e) => e.letter === letter);
      const updated = existing
        ? f.optionExplanations.map((e) => e.letter === letter ? { ...e, [field]: value } : e)
        : [...f.optionExplanations, { letter, whyTrue: field === 'whyTrue' ? value : '', whyFalse: field === 'whyFalse' ? value : '' }];
      return { ...f, optionExplanations: updated };
    });
  };

  const addTag = (field) => {
    setForm((f) => ({ ...f, [field]: [...(f[field] || []), ''] }));
  };
  const updateTag = (field, idx, val) => {
    setForm((f) => ({ ...f, [field]: f[field].map((t, i) => i === idx ? val : t) }));
  };
  const removeTag = (field, idx) => {
    setForm((f) => ({ ...f, [field]: f[field].filter((_, i) => i !== idx) }));
  };

  // ── Bulk selection ────────────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === quizzes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(quizzes.map((q) => q._id)));
    }
  };
  const handleBulkAction = async (action) => {
    play('submit');
    if (submittingRef.current) return;
    const ids = [...selectedIds];
    if (!ids.length) return notify(t('admin.quiz.noQuizSelected'), 'warning');
    if (action === 'delete') { setBulkDeleteTarget(ids); return; }
    submittingRef.current = true;
    setSubmitting(true);
    setBulkProcessing(true);
    try {
      const url = action === 'publish' ? '/api/quizzes/bulk/publish' : '/api/quizzes/bulk/unpublish';
      const res = await authFetch(url, { method: 'POST', body: { ids } });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: `HTTP ${res.status}: ${text.substring(0, 100)}` }; }
      if (res.ok) { notify(data.message, 'success'); setSelectedIds(new Set()); fetchQuizzes(); }
      else notify(`${t('admin.quiz.error', 'Erreur')} (${res.status}): ${data.message}`, 'error');
    } catch (e) { logger.error({ err: e }, 'QuizManagement handleBulkAction failed'); notify(`${t('admin.quiz.bulkActionFailed', 'Action groupée échouée')}: ${e.message}`, 'error'); }
    finally { setBulkProcessing(false); submittingRef.current = false; setSubmitting(false); }
  };

  const confirmBulkDelete = async () => {
    play('delete');
    if (!bulkDeleteTarget?.length || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setBulkProcessing(true);
    try {
      const res = await authFetch('/api/quizzes/bulk/delete', { method: 'POST', body: { ids: bulkDeleteTarget } });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { message: `HTTP ${res.status}: ${text.substring(0, 100)}` }; }
      if (res.ok) { notify(data.message, 'success'); setSelectedIds(new Set()); fetchQuizzes(); }
      else notify(`${t('admin.quiz.error', 'Erreur')} (${res.status}): ${data.message}`, 'error');
    } catch (e) { logger.error({ err: e }, 'QuizManagement confirmBulkDelete failed'); notify(`${t('admin.quiz.bulkDeleteFailed', 'Suppression groupée échouée')}: ${e.message}`, 'error'); }
    finally { setBulkProcessing(false); setBulkDeleteTarget(null); submittingRef.current = false; setSubmitting(false); }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setCsvImporting(true);
      const res    = await authFetch('/api/quizzes/import-csv', { method: 'POST', body: formData });
      const result = res.ok ? await res.json() : null;
      notify(result?.message || 'Import finished', res.ok ? 'success' : 'error');
      fetchQuizzes();
    } catch (err) { logger.error({ err }, 'QuizManagement CSV import failed'); notify(t('admin.quiz.csvImportFailed'), 'error'); }
    finally { setCsvImporting(false); e.target.value = ''; }
  };

  const handleCreateCase = async () => {
    play('submit');
    if (submittingRef.current) return;
    if (!caseForm.title || !caseForm.description || !caseForm.moduleId)
      return notify(t('admin.quiz.fillAllFields'), 'warning');
    const incomplete = caseForm.quizzes.findIndex((q) => !q.questionText || q.options.some((o) => !o) || q.correctIndices.length === 0);
    if (incomplete >= 0) return notify(t('admin.quiz.quizIncomplete', { n: incomplete + 1 }), 'warning');
    submittingRef.current = true;
    setSubmitting(true);
    setCreatingCase(true);
    try {
      const res = await authFetch('/api/admin/cases/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: caseForm.title, description: caseForm.description, moduleId: caseForm.moduleId, discipline: caseForm.discipline || undefined, course: caseForm.course || undefined, quizzes: caseForm.quizzes }),
      });
      const data = res.ok ? await res.json() : null;
      if (res.ok) {
        notify(data.message, 'success');
        setShowCaseModal(false);
        setCaseForm({ year: '', moduleId: '', discipline: '', title: '', description: '', course: '', quizzes: [emptyQuiz(), emptyQuiz(), emptyQuiz()] });
        fetchQuizzes();
      } else {
        notify(`Error: ${data.message}`, 'error');
      }
    } catch (err) {
      logger.error({ err }, 'QuizManagement handleCreateCase failed');
      notify(t('admin.quiz.createCaseFailed'), 'error');
    } finally {
      setCreatingCase(false);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const setCaseField = (field, value) => setCaseForm((f) => ({ ...f, [field]: value }));

  const updateQuiz = (idx, field, value) => {
    setCaseForm((f) => {
      const quizzes = [...f.quizzes];
      quizzes[idx] = { ...quizzes[idx], [field]: value };
      return { ...f, quizzes };
    });
  };

  const updateQuizOption = (qIdx, oIdx, value) => {
    setCaseForm((f) => {
      const quizzes = [...f.quizzes];
      const options = [...quizzes[qIdx].options];
      options[oIdx] = value;
      quizzes[qIdx] = { ...quizzes[qIdx], options };
      return { ...f, quizzes };
    });
  };

  const toggleQuizCorrect = (qIdx, oIdx) => {
    setCaseForm((f) => {
      const quizzes = [...f.quizzes];
      const idx = quizzes[qIdx].correctIndices.indexOf(oIdx);
      quizzes[qIdx] = {
        ...quizzes[qIdx],
        correctIndices: idx >= 0
          ? quizzes[qIdx].correctIndices.filter((i) => i !== oIdx)
          : [...quizzes[qIdx].correctIndices, oIdx],
      };
      return { ...f, quizzes };
    });
  };

  const handleQuizCountChange = (n) => {
    const count = Math.max(1, Math.min(50, n || 1));
    setCaseForm((f) => {
      const existing = f.quizzes;
      return {
        ...f,
        quizzes: Array.from({ length: count }, (_, i) => existing[i] || emptyQuiz()),
      };
    });
  };

  const caseFilteredModules = modules.filter((m) => {
    if (caseForm.discipline && m.discipline !== caseForm.discipline) return false;
    if (caseForm.year && m.year !== Number(caseForm.year)) return false;
    return true;
  });

  const filterModulesForBar = modules.filter((m) => {
    if (filterYear && m.year !== Number(filterYear)) return false;
    if (filterDiscipline && m.discipline !== filterDiscipline) return false;
    return true;
  });

  return (
    <div className="quiz-management">
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="qm-header">
        <h1 className="qm-logo brand-name">MAITRISEZ <span className="qm-logo-light">| Admin Dashboard</span></h1>
        <span className="qm-user">Admin</span>
      </div>

      <div className="qm-breadcrumb">{t('admin.dashboard.title')} / {t('admin.quiz.title')} / {t('admin.quiz.addNew')}</div>

      <div className="qm-csv-import">
        <strong>{t('admin.quiz.importCSV')}</strong>
        <input type="file" accept=".csv" onChange={handleCSVImport} disabled={csvImporting} />
        {csvImporting && <span className="qm-spinner">{t('admin.quiz.csvImporting')}</span>}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button type="button" className="btn-publish" style={{ padding: '10px 22px', border: 'none', borderRadius: 'var(--dc-radius-sm)', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => setShowCaseModal(true)}>➕ {t('admin.quiz.newCase')}</button>
      </div>

      <div className="qm-form" key={formKey}>
        <h2 className="qm-form-title">{editId ? t('admin.quiz.edit') : t('admin.quiz.addNew')}</h2>

        <div className="qm-filters">
          <select value={form.discipline} onChange={(e) => { setField('discipline', e.target.value); setField('selectedYear', ''); setField('moduleId', ''); }}>
            <option value="">{t('admin.quiz.chooseDiscipline')}</option>
            <option value="medicine">{t('admin.quiz.medicine')}</option>
            <option value="pharmacy">{t('admin.quiz.pharmacy')}</option>
          </select>
          <select value={form.selectedYear} onChange={(e) => { setField('selectedYear', e.target.value); setField('moduleId', ''); }}>
            <option value="">{t('admin.quiz.chooseYear')}</option>
            {YEARS.map((y) => <option key={y} value={y}>{t('pricing.year', { n: y })}</option>)}
          </select>
          <select value={form.moduleId} onChange={(e) => setField('moduleId', e.target.value)} disabled={!form.selectedYear}>
            <option value="">{t('admin.quiz.chooseModule')}</option>
            {filteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
          <select className="qm-input-sm" value={form.course} onChange={(e) => setField('course', e.target.value)} disabled={!form.moduleId || moduleCourses.length === 0}>
            <option value="">{t('admin.quiz.course')}</option>
            {moduleCourses.map((c, i) => {
              const cName = typeof c === 'string' ? c : c.name || '';
              return <option key={i} value={cName}>{cName}</option>;
            })}
          </select>
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.questionText')}</label>
          <textarea className="qm-textarea" value={form.questionText} onChange={(e) => setField('questionText', e.target.value)} placeholder="Write the question here..." rows={4} />
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.imageLabel')}</label>
          {imagePreview && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
              <img src={imagePreview} alt="Preview" style={{ maxWidth: 200, borderRadius: 6, border: '1px solid #ccc' }} />
              <button type="button" onClick={() => { setImagePreview(null); setQuestionImage(null); setRemoveImage(true); }} style={{ position: 'absolute', top: 4, right: 4, background: 'red', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12, lineHeight: '22px', textAlign: 'center' }}>&times;</button>
            </div>
          )}
          {!imagePreview && (
            <input type="file" accept="image/*" onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setQuestionImage(file); setImagePreview(URL.createObjectURL(file)); setRemoveImage(false); }
            }} />
          )}
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.options')}</label>
          <div className="qm-options-header">
            <span className="col-letter">Letter</span>
            <span className="col-text">Option</span>
          </div>
          <div key={formKey}>
            {form.options.map((opt, i) => (<OptionItem key={i} i={i} opt={opt} onUpdate={updateOption} isCorrect={form.correctIndices.includes(i)} />))}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
            <label style={{ fontWeight: 600 }}>{t('admin.quiz.optionsCount')}</label>
            <select value={form.options.length} onChange={(e) => {
              const n = Number(e.target.value);
              setForm((f) => {
                const curr = f.options.length;
                if (n > curr) return { ...f, options: [...f.options, ...Array(n - curr).fill('')] };
                return { ...f, options: f.options.slice(0, n), correctIndices: f.correctIndices.filter((i) => i < n) };
              });
            }} style={{ padding: '4px 8px' }}>
              {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} options</option>)}
            </select>
          </div>
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.correctAnswers')}</label>
          <div className="qm-answer-letters">
            {LETTERS.slice(0, form.options.length).map((l, i) => (
              <button key={i} type="button" className={`letter-btn ${form.correctIndices.includes(i) ? 'selected' : ''}`}
                onClick={() => toggleCorrect(i, !form.correctIndices.includes(i))}>
                {form.correctIndices.includes(i) ? <FaCheck /> : l}
              </button>
            ))}
          </div>
          <span className="qm-hint">{t('admin.quiz.correctHint', 'Click letters to toggle correct answers')}</span>
        </div>

        <div className="qm-section">
          <label className="qm-label">{t('admin.quiz.explanation')}</label>
          <textarea className="qm-textarea" value={form.explanation} onChange={(e) => setField('explanation', e.target.value)} placeholder="Write explanation here..." rows={3} />
        </div>

        <div className="qm-section" style={{ background: 'var(--color-bg, #f0f4f8)', padding: 14, borderRadius: 8, border: '1px dashed var(--dc-border, #ccc)' }}>
          <label className="qm-label" style={{ marginBottom: 12 }}>{t('admin.quiz.structuredExplanation', 'Explication structurée (optionnel)')}</label>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted, #666)', marginBottom: 6 }}>
              {t('admin.quiz.optionExplanations', 'Pourquoi chaque option est vraie/fausse')}
            </div>
            {LETTERS.slice(0, form.options.length).map((letter) => {
              const expl = form.optionExplanations.find((e) => e.letter === letter) || {};
              const hasText = expl.whyTrue || expl.whyFalse;
              return (
                <details key={letter} style={{ marginBottom: 6 }}>
                  <summary style={{ fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', padding: '4px 0', color: hasText ? 'var(--teal-dark, #007355)' : 'var(--text-muted, #666)' }}>
                    {letter}. {hasText ? `✓ ${expl.whyTrue || expl.whyFalse}` : t('admin.quiz.clickToExplain', 'Cliquer pour expliquer')}
                  </summary>
                  <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="text"
                      placeholder={t('admin.quiz.whyTrue', `Pourquoi ${letter} est vraie`)}
                      value={expl.whyTrue || ''}
                      onChange={(e) => updateOptionExplanation(letter, 'whyTrue', e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--dc-border, #ccc)', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                    <input
                      type="text"
                      placeholder={t('admin.quiz.whyFalse', `Pourquoi ${letter} est fausse`)}
                      value={expl.whyFalse || ''}
                      onChange={(e) => updateOptionExplanation(letter, 'whyFalse', e.target.value)}
                      style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--dc-border, #ccc)', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </details>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted, #666)', marginBottom: 6 }}>
                {t('admin.quiz.keyConcepts', 'Concepts clés')}
              </div>
              {(form.keyConcepts || []).map((concept, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={concept}
                    onChange={(e) => updateTag('keyConcepts', i, e.target.value)}
                    placeholder={t('admin.quiz.addConcept', 'Concept...')}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--dc-border, #ccc)', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => removeTag('keyConcepts', i)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addTag('keyConcepts')} style={{ fontSize: '0.75rem', color: 'var(--teal-dark, #007355)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                + {t('admin.quiz.addConcept', 'Ajouter un concept')}
              </button>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted, #666)', marginBottom: 6 }}>
                {t('admin.quiz.commonTraps', 'Pièges fréquents')}
              </div>
              {(form.commonTraps || []).map((trap, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={trap}
                    onChange={(e) => updateTag('commonTraps', i, e.target.value)}
                    placeholder={t('admin.quiz.addTrap', 'Piège...')}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--dc-border, #ccc)', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => removeTag('commonTraps', i)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addTag('commonTraps')} style={{ fontSize: '0.75rem', color: 'var(--teal-dark, #007355)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                + {t('admin.quiz.addTrap', 'Ajouter un piège')}
              </button>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted, #666)', marginBottom: 6 }}>
                {t('admin.quiz.tags', 'Tags')}
              </div>
              {(form.tags || []).map((tag, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => updateTag('tags', i, e.target.value)}
                    placeholder={t('admin.quiz.addTag', 'Tag...')}
                    style={{ flex: 1, padding: '4px 8px', border: '1px solid var(--dc-border, #ccc)', borderRadius: 4, fontSize: '0.8rem', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => removeTag('tags', i)} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addTag('tags')} style={{ fontSize: '0.75rem', color: 'var(--teal-dark, #007355)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                + {t('admin.quiz.addTag', 'Ajouter un tag')}
              </button>
            </div>
          </div>
        </div>

        <div className="qm-actions">
          <button type="button" className="btn-draft" onClick={() => handleSubmit(false)} disabled={submitting}><FaSave /> {t('admin.quiz.saveDraft')}</button>
          <button type="button" className="btn-publish" onClick={() => handleSubmit(true)} disabled={submitting}><FaPaperPlane /> {t('admin.quiz.publish')}</button>
          {editId && <button type="button" className="btn-cancel" onClick={resetForm}>{t('admin.quiz.cancel')}</button>}
        </div>
      </div>

      <div className="qm-list-filters">
        <select value={filterDiscipline} onChange={(e) => { setFilterDiscipline(e.target.value); setFilterModule(''); }}>
          <option value="">{t('admin.quiz.allDisciplines')}</option>
          <option value="medicine">{t('admin.quiz.medicine')}</option>
          <option value="pharmacy">{t('admin.quiz.pharmacy')}</option>
        </select>
        <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setFilterModule(''); }}>
          <option value="">{t('admin.quiz.allYears')}</option>
          {YEARS.map((y) => <option key={y} value={y}>{t('pricing.year', { n: y })}</option>)}
        </select>
        <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
          <option value="">{t('admin.quiz.allModules')}</option>
          {filterModulesForBar.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
        </select>
        <input type="text" placeholder={`🔍 ${t('admin.quiz.search')}`} value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          style={{ flex: 1, minWidth: '150px', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--dc-border)', fontSize: '13px' }} />
      </div>

      <div className="qm-bulk-bar" style={{
        display: selectedIds.size > 0 ? 'flex' : 'none',
        alignItems: 'center', gap: '10px', padding: '10px 14px',
        background: 'var(--dc-accent-light, #e0f2f1)', borderRadius: '8px',
        marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600,
        flexWrap: 'wrap',
      }}>
        <span>{t('admin.quiz.selected', { count: selectedIds.size })}</span>
        <button type="button" className="btn-publish" style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
          onClick={() => handleBulkAction('publish')} disabled={bulkProcessing}>
          {t('admin.quiz.bulkPublish')}
        </button>
        <button type="button" style={{ padding: '6px 16px', border: '1px solid var(--dc-border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: 'var(--dc-white)' }}
          onClick={() => handleBulkAction('unpublish')} disabled={bulkProcessing}>
          {t('admin.quiz.bulkUnpublish')}
        </button>
        <button type="button" style={{ padding: '6px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: 'var(--dc-highlight)', color: 'var(--dc-white)' }}
          onClick={() => handleBulkAction('delete')} disabled={bulkProcessing}>
          <FaTrash /> {t('admin.quiz.bulkDelete')}
        </button>
        <button type="button" style={{ marginLeft: 'auto', padding: '4px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: 'transparent', color: 'var(--dc-text-muted)' }}
          onClick={() => setSelectedIds(new Set())}>
          {t('admin.quiz.bulkCancel')}
        </button>
      </div>

      {loading ? <Spinner /> : (
        <div className="qm-table-wrapper">
        <table className="qm-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" aria-label="Select all" checked={quizzes.length > 0 && selectedIds.size === quizzes.length}
                  onChange={toggleSelectAll} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
              </th>
              {[t('admin.quiz.quizId'), t('admin.quiz.year'), t('admin.quiz.module'), t('admin.quiz.course'), 'Discipline', t('admin.quiz.published'), 'Case', t('admin.quiz.questionText'), t('admin.quiz.options'), t('admin.quiz.correctAnswers'), 'Actions'].map((h) => (<th key={h}>{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {quizzes.length === 0
                ? <tr><td colSpan="12" className="qm-empty">{t('admin.quiz.noQuizzes')}</td></tr>
                : quizzes.map((quiz) => (
                  <tr key={quiz._id} style={{ background: selectedIds.has(quiz._id) ? 'var(--dc-cream-light)' : undefined }}>
                    <td>
                      <input type="checkbox" aria-label={t('admin.quizzes.selectQuiz')} checked={selectedIds.has(quiz._id)}
                        onChange={() => toggleSelect(quiz._id)} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    </td>
                    <td>{quiz.quizId}</td>
                    <td>Y{quiz.year}</td>
                    <td>{quiz.moduleId?.name || '—'}</td>
                    <td>{quiz.course || '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{quiz.discipline || '—'}</td>
                    <td>{quiz.published
                      ? <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{t('admin.quiz.published')}</span>
                      : <span style={{ color: 'var(--dc-text-muted)' }}>{t('admin.quiz.draft')}</span>}</td>
                    <td>{quiz.caseId ? <span style={{ background: 'var(--dc-cream-light)', color: 'var(--dc-accent)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>📋 {quiz.caseId?.title || 'Case'}</span> : '—'}</td>
                    <td className="qm-cell-text">{quiz.question?.questionText}</td>
                    <td>{quiz.question?.options?.join(', ')}</td>
                    <td>{quiz.question?.correctAnswers?.join(', ')}</td>
                    <td className="qm-cell-actions">
                      <button onClick={() => startEdit(quiz)}><FaEdit /></button>
                      <button onClick={() => setDeleteTarget(quiz)}><FaTrash /></button>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        </div>
      )}
      {!loading && <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchQuizzes(p)} />}

      {showCaseModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => !creatingCase && setShowCaseModal(false)}>
          <div style={{
            background: 'var(--dc-white, #fff)', borderRadius: 'var(--dc-radius, 12px)',
            padding: '28px', width: '90%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.2rem', color: 'var(--dc-dark)' }}>📋 {t('admin.quiz.newCase')}</h2>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <select value={caseForm.discipline} onChange={(e) => { setCaseField('discipline', e.target.value); setCaseField('year', ''); setCaseField('moduleId', ''); }} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">{t('admin.quiz.allDisciplines')}</option>
                <option value="medicine">{t('admin.quiz.medicine')}</option>
                <option value="pharmacy">{t('admin.quiz.pharmacy')}</option>
              </select>
              <select value={caseForm.year} onChange={(e) => { setCaseField('year', e.target.value); setCaseField('moduleId', ''); }} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
            <option value="">{t('admin.quiz.chooseYear')}</option>
                {YEARS.map((y) => <option key={y} value={y}>{t('pricing.year', { n: y })}</option>)}
              </select>
              <select value={caseForm.moduleId} onChange={(e) => { setCaseField('moduleId', e.target.value); setCaseField('course', ''); }} disabled={!caseForm.year} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">{t('admin.quiz.chooseModule')}</option>
                {caseFilteredModules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
              <select value={caseForm.course} onChange={(e) => setCaseField('course', e.target.value)} disabled={!caseForm.moduleId || caseModuleCourses.length === 0} style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">{t('admin.quiz.course')}</option>
                {caseModuleCourses.map((c, i) => {
                  const cName = typeof c === 'string' ? c : c.name || '';
                  return <option key={i} value={cName}>{cName}</option>;
                })}
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--dc-text)' }}>{t('admin.quiz.caseTitle')}</label>
              <input type="text" value={caseForm.title} onChange={(e) => setCaseField('title', e.target.value)} placeholder={t('admin.quiz.caseTitlePlaceholder')} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px', color: 'var(--dc-text)' }}>{t('admin.quiz.caseDescription')}</label>
              <textarea value={caseForm.description} onChange={(e) => setCaseField('description', e.target.value)} placeholder={t('admin.quiz.caseDescriptionPlaceholder')} rows={4} style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dc-text)' }}>{t('admin.quiz.caseQuizCount')}</label>
              <input type="number" min="1" max="50" value={caseForm.quizzes.length} onChange={(e) => handleQuizCountChange(Number(e.target.value))} style={{ width: '80px', padding: '8px 10px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.9rem' }} />
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto', marginBottom: '20px' }}>
              {caseForm.quizzes.map((quiz, qIdx) => (
                <div key={qIdx} style={{
                  border: '1px solid var(--dc-border)', borderRadius: '8px', padding: '16px', marginBottom: '12px',
                  background: qIdx % 2 === 0 ? 'var(--dc-cream)' : 'var(--dc-white)',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dc-accent)', marginBottom: '10px' }}>{t('admin.quiz.caseQuizN', { n: qIdx + 1 })}</div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--dc-text)' }}>{t('admin.quiz.caseQuestion')}</label>
                    <textarea value={quiz.questionText} onChange={(e) => updateQuiz(qIdx, 'questionText', e.target.value)} placeholder={t('admin.quiz.caseQuestionPlaceholder')} rows={2} style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--dc-border)', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  </div>

                  <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--dc-text)' }}>{t('admin.quiz.caseOptions')}</label>
                    {LETTERS.slice(0, quiz.options.length).map((l, oIdx) => (
                      <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--dc-accent)', width: '20px' }}>{l}</span>
                        <input type="text" value={quiz.options[oIdx]} onChange={(e) => updateQuizOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${l}`} style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--dc-border)', borderRadius: '4px', fontSize: '0.85rem' }} />
                        <input type="checkbox" checked={quiz.correctIndices.includes(oIdx)} onChange={() => toggleQuizCorrect(qIdx, oIdx)} title="Correct answer" style={{ cursor: 'pointer' }} />
                      </div>
                    ))}
                    <div style={{ fontSize: '0.75rem', color: 'var(--dc-text-light)', marginTop: '2px' }}>{t('admin.quiz.caseCorrectHint')}</div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '4px', color: 'var(--dc-text)' }}>{t('admin.quiz.caseExplanation')}</label>
                    <input type="text" value={quiz.explanation} onChange={(e) => updateQuiz(qIdx, 'explanation', e.target.value)} placeholder={t('admin.quiz.caseExplanationPlaceholder')} style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--dc-border)', borderRadius: '4px', fontSize: '0.85rem', boxSizing: 'border-box' }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--dc-border)', paddingTop: '16px' }}>
              <button type="button" onClick={() => setShowCaseModal(false)} disabled={creatingCase} style={{ padding: '10px 22px', border: '1px solid var(--dc-border)', borderRadius: '6px', background: 'var(--dc-cream-light, #f5f3f7)', cursor: 'pointer', fontWeight: 600 }}>{t('cancel')}</button>
              <button type="button" onClick={handleCreateCase} disabled={creatingCase} style={{ padding: '10px 22px', border: 'none', borderRadius: '6px', background: 'linear-gradient(135deg, var(--dc-dark), var(--dc-accent))', color: 'var(--dc-white)', cursor: 'pointer', fontWeight: 700 }}>{creatingCase ? t('admin.quiz.creatingCase') : t('admin.quiz.createCaseBtn')}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('admin.quiz.deleteConfirm')}
        message={t('admin.quiz.deleteConfirmMsg', { id: deleteTarget?.quizId || '' })}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText={t('admin.quiz.delete')}
        confirmDisabled={submitting}
      />

      <ConfirmModal
        open={!!bulkDeleteTarget}
        title={t('admin.quiz.deleteConfirm')}
        message={t('admin.quiz.deleteConfirmMsg', { id: `${bulkDeleteTarget?.length || 0} selected` })}
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteTarget(null)}
        confirmText={t('admin.quiz.delete')}
        cancelText={t('admin.quiz.cancel')}
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default QuizManagement;
