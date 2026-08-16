import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { FaTrash, FaFilePdf, FaUpload } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/sharedAdmin.css';

const PdfManagement = () => {
  const { t, lang } = useTranslation();
  useDocumentTitle(t('admin.pdf.title'), 'Admin');
  const notify = useToast();
  const play = useSound();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const fetchPdfs = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/pdf-documents');
      if (res.ok) setPdfs(await res.json());
    } catch (e) { logger.error({ err: e }, 'PdfManagement fetch failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPdfs(); }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !newName.trim()) return notify('Select a file and enter a name', 'warning');
    play('submit');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', newName.trim());
      const res = await authFetch('/api/pdf-documents', { method: 'POST', body: fd });
      if (res.ok) {
        notify('PDF uploaded', 'success');
        setNewName('');
        if (fileRef.current) fileRef.current.value = '';
        fetchPdfs();
      } else {
        const err = await res.json();
        notify(err.message || 'Upload failed', 'error');
      }
    } catch (e) { logger.error({ err: e }, 'PdfManagement upload failed'); notify('Network error', 'error'); }
    finally { setUploading(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    play('delete');
    setSubmitting(true);
    try {
      const res = await authFetch(`/api/pdf-documents/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) { notify('PDF deleted', 'success'); fetchPdfs(); }
      else notify('Delete failed', 'error');
    } catch (e) { logger.error({ err: e }, 'PdfManagement delete failed'); notify('Network error', 'error'); }
    setDeleteTarget(null);
    setSubmitting(false);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) return <div className="admin-page"><h2>PDF Management</h2><Spinner /></div>;

  return (
    <div className="admin-page">
      <h2>PDF Management</h2>

      <div className="admin-form-card">
        <h3>Upload PDF</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="PDF name (e.g. Cardiology — Chapter 1)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}
          />
          <input type="file" accept=".pdf" ref={fileRef} style={{ flex: 1, minWidth: 200 }} />
          <button onClick={handleUpload} disabled={uploading || !newName.trim()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}>
            <FaUpload /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>PDF ID</th>
              <th>Name</th>
              <th>File</th>
              <th>Size</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pdfs.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--dc-text-muted)' }}>No PDFs uploaded yet.</td></tr>
            ) : pdfs.map((pdf) => (
              <tr key={pdf._id}>
                <td><code>{pdf.pdfId}</code></td>
                <td>{pdf.name}</td>
                <td>
                  <button onClick={async () => {
                    try {
                      const res = await authFetch(`/api/course-pdfs/${encodeURIComponent(pdf.filename)}`);
                       if (res.ok) { const { url } = await res.json(); window.open(url, '_blank', 'noopener,noreferrer'); }
                    } catch { notify('Failed to open PDF', 'error'); }
                  }} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dc-accent)', fontSize: '0.85rem', padding: 0 }}>
                    <FaFilePdf /> {pdf.originalName || pdf.filename}
                  </button>
                </td>
                <td>{formatSize(pdf.size)}</td>
                <td>{pdf.createdAt ? formatDate(pdf.createdAt, lang) : '—'}</td>
                <td>
                  <button onClick={() => setDeleteTarget(pdf)} style={{ color: 'var(--color-danger)' }}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete PDF"
        message={`Delete "${deleteTarget?.name}" (${deleteTarget?.pdfId})?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default PdfManagement;
