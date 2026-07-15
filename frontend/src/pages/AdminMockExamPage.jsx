import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../config/authFetch';
import { useToast } from '../components/Toast';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import { FaPlus, FaEdit, FaTrash, FaTimes } from 'react-icons/fa';
import ConfirmModal from '../components/ConfirmModal';

const emptyForm = () => ({
  title: '', moduleId: '', quizIds: [], duration: 30, published: false,
});

const AdminMockExamPage = () => {
  const { t } = useTranslation();
  const notify = useToast();
  const [exams, setExams] = useState([]);
  const [modules, setModules] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchExams = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/mock-exams');
      if (res.ok) setExams(await res.json());
    } catch (err) { logger.error({ err }, 'fetch mock exams'); }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const res = await authFetch('/api/modules');
      if (res.ok) setModules(await res.json());
    } catch (err) { logger.error({ err }, 'fetch modules'); }
  }, []);

  useEffect(() => { Promise.all([fetchExams(), fetchModules()]).finally(() => setLoading(false)); }, [fetchExams, fetchModules]);

  const fetchQuizzesForModule = async (moduleId) => {
    if (!moduleId) { setQuizzes([]); return; }
    try {
      const res = await authFetch(`/api/admin/quizzes?moduleId=${moduleId}&limit=200`);
      if (res.ok) {
        const data = await res.json();
        setQuizzes(Array.isArray(data) ? data : data.quizzes || []);
      }
    } catch (err) { logger.error({ err }, 'fetch quizzes'); }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm());
    setQuizzes([]);
    setShowForm(true);
  };

  const openEdit = (exam) => {
    setEditId(exam._id);
    setForm({ title: exam.title, moduleId: exam.moduleId?._id || exam.moduleId, quizIds: exam.quizIds || [], duration: exam.duration, published: exam.published });
    fetchQuizzesForModule(exam.moduleId?._id || exam.moduleId);
    setShowForm(true);
  };

  const handleModuleChange = (moduleId) => {
    setForm((f) => ({ ...f, moduleId, quizIds: [] }));
    fetchQuizzesForModule(moduleId);
  };

  const toggleQuiz = (qId) => {
    setForm((f) => ({
      ...f,
      quizIds: f.quizIds.includes(qId) ? f.quizIds.filter((id) => id !== qId) : [...f.quizIds, qId],
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.moduleId || form.quizIds.length === 0) {
      notify(t('admin.mockExam.fillRequired'), 'warning'); return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/mock-exams/${editId}` : '/api/admin/mock-exams';
      const method = editId ? 'PUT' : 'POST';
      const res = await authFetch(url, { method, body: form });
      if (res.ok) {
        notify(editId ? t('admin.mockExam.updated') : t('admin.mockExam.created'), 'success');
        setShowForm(false);
        await fetchExams();
      } else {
        const d = await res.json();
        notify(d.message || t('admin.mockExam.error'), 'error');
      }
    } catch (err) { notify(t('admin.mockExam.networkError'), 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authFetch(`/api/admin/mock-exams/${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) { notify(t('admin.mockExam.deleted'), 'success'); await fetchExams(); }
      else notify(t('admin.mockExam.deleteFailed'), 'error');
    } catch { notify(t('admin.mockExam.networkError'), 'error'); }
    finally { setDeleteTarget(null); }
  };

  const filteredQuizzes = quizzes.filter((q) => {
    if (!search) return true;
    const text = (q.question?.questionText || q.quizId || '').toLowerCase();
    return text.includes(search.toLowerCase());
  });

  if (loading) return <div className="admin-loading">{t('admin.mockExam.loading')}</div>;

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>{t('admin.mockExam.title')}</h1>
        <button className="btn-primary" onClick={openCreate}><FaPlus /> {t('admin.mockExam.create')}</button>
      </div>

      {showForm && (
        <div className="admin-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
            <div className="admin-modal-header">
              <h2>{editId ? t('admin.mockExam.editModal') : t('admin.mockExam.createModal')}</h2>
              <button className="admin-modal-close" onClick={() => setShowForm(false)}><FaTimes /></button>
            </div>
            <div className="admin-modal-body">
              <label>{t('admin.mockExam.titleLabel')}</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

              <label>{t('admin.mockExam.moduleLabel')}</label>
              <select value={form.moduleId} onChange={(e) => handleModuleChange(e.target.value)}>
                <option value="">{t('admin.mockExam.selectModule')}</option>
                {modules.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>

              {form.moduleId && (
                <>
                  <label>{t('admin.mockExam.durationLabel')}</label>
                  <input type="number" min={1} max={180} value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                    <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                    {t('admin.mockExam.publishedLabel')}
                  </label>

                  <label>{t('admin.mockExam.selectQuizzes', { count: form.quizIds.length })}</label>
                  <input type="text" placeholder={t('admin.mockExam.searchQuizzes')} value={search} onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--border-light)', marginBottom: 8, fontSize: 13 }} />
                  <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 8, padding: 4 }}>
                    {filteredQuizzes.length === 0 && <p style={{ padding: 12, color: '#888', fontSize: 13 }}>{t('admin.mockExam.noQuizzes')}</p>}
                    {filteredQuizzes.map((q) => (
                      <label key={q._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 4, fontSize: 13, background: form.quizIds.includes(q._id) ? 'var(--color-info-bg)' : 'transparent' }}>
                        <input type="checkbox" checked={form.quizIds.includes(q._id)} onChange={() => toggleQuiz(q._id)} />
                        <span style={{ flex: 1 }}>{(q.question?.questionText || q.quizId || '').substring(0, 100)}</span>
                        <span style={{ fontSize: 11, color: '#888' }}>{t('admin.mockExam.year', { year: q.year })}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="btn-dark" onClick={() => setShowForm(false)}>{t('admin.mockExam.cancel')}</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? t('admin.mockExam.saving') : t('admin.mockExam.save')}</button>
            </div>
          </div>
        </div>
      )}

      <table className="admin-table">
        <thead>
          <tr><th>{t('admin.mockExam.tableTitle')}</th><th>{t('admin.mockExam.tableModule')}</th><th>{t('admin.mockExam.tableQuestions')}</th><th>{t('admin.mockExam.tableDuration')}</th><th>{t('admin.mockExam.tablePublished')}</th><th>{t('admin.mockExam.tableActions')}</th></tr>
        </thead>
        <tbody>
          {exams.length === 0 && <tr><td colSpan={6} className="admin-empty">{t('admin.mockExam.empty')}</td></tr>}
          {exams.map((e) => (
            <tr key={e._id}>
              <td>{e.title}</td>
              <td>{e.moduleId?.name || '-'}</td>
              <td>{e.quizIds?.length || 0}</td>
              <td>{e.duration} {t('admin.mockExam.min')}</td>
              <td>{e.published ? t('admin.mockExam.yes') : t('admin.mockExam.no')}</td>
              <td>
                <button className="btn-icon" onClick={() => openEdit(e)} aria-label={t('admin.mockExam.edit')}><FaEdit /></button>
                <button className="btn-icon" style={{ color: '#d32f2f' }} onClick={() => handleDelete(e._id)} aria-label={t('admin.mockExam.delete')}><FaTrash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ConfirmModal
        open={!!deleteTarget}
        title={t('admin.mockExam.deleteConfirm')}
        message={t('admin.mockExam.deleteConfirm')}
        confirmText={t('admin.mockExam.delete')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default AdminMockExamPage;
