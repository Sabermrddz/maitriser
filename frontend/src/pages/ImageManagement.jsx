import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../config/authFetch';
import { API_BASE_URL } from '../config/api';
import { FaTrash, FaUpload } from 'react-icons/fa';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import { useTranslation } from '../context/LanguageContext';
import { formatDate } from '../utils/formatDate';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import '../styles/sharedAdmin.css';

const ImageManagement = () => {
  const { t, lang } = useTranslation();
  useDocumentTitle(t('admin.image.title'), 'Admin');
  const notify = useToast();
  const play = useSound();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileRef = useRef(null);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/admin/images');
      if (res.ok) setImages(await res.json());
    } catch (e) { logger.error({ err: e }, 'ImageManagement fetch failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchImages(); }, []);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return notify('Select an image file', 'warning');
    play('submit');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authFetch('/api/admin/images', { method: 'POST', body: fd });
      if (res.ok) {
        notify('Image uploaded', 'success');
        if (fileRef.current) fileRef.current.value = '';
        fetchImages();
      } else {
        const err = await res.json();
        notify(err.message || 'Upload failed', 'error');
      }
    } catch (e) { logger.error({ err: e }, 'ImageManagement upload failed'); notify('Network error', 'error'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (key) => {
    play('delete');
    try {
      const res = await authFetch('/api/admin/images', { method: 'DELETE', body: { key } });
      if (res.ok) { notify('Image deleted', 'success'); fetchImages(); }
      else notify('Delete failed', 'error');
    } catch (e) { logger.error({ err: e }, 'ImageManagement delete failed'); notify('Network error', 'error'); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await handleDelete(deleteTarget);
    setDeleteTarget(null);
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getSourceLabel = (s) => {
    if (s === 'quiz') return 'Quiz';
    if (s === 'voice-exam') return 'Voice Exam';
    return 'Other';
  };

  if (loading) return <div className="admin-page"><h2>Image Management</h2><Spinner /></div>;

  return (
    <div className="admin-page">
      <h2>Image Management</h2>

      <div className="admin-form-card">
        <h3>Upload Image</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="file" accept="image/*" ref={fileRef} style={{ flex: 1, minWidth: 200 }} />
          <button onClick={handleUpload} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px' }}>
            <FaUpload /> {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Preview</th>
              <th>Filename</th>
              <th>Source</th>
              <th>Size</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {images.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--dc-text-muted)' }}>No images uploaded yet.</td></tr>
            ) : images.map((img, i) => (
              <tr key={img.key || i}>
                <td>
                  <img src={`${API_BASE_URL}/api/quiz-images/${(img.key?.split('/')?.pop()) || ''}`}
                       alt={img.key?.split('/')?.pop() || 'Image'}
                       style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-light)' }}
                       onError={(e) => { e.target.style.display = 'none'; }} />
                </td>
                <td style={{ fontSize: '0.85rem', maxWidth: 300, wordBreak: 'break-all' }}>{img.key}</td>
                <td><span className="year-tag">{getSourceLabel(img.source)}</span></td>
                <td>{formatSize(img.size)}</td>
                <td>{img.lastModified ? formatDate(img.lastModified, lang) : '—'}</td>
                <td>
                  <button onClick={() => setDeleteTarget(img.key)} style={{ color: 'var(--color-danger)' }}><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Image"
        message={`Delete "${deleteTarget}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText="Delete"
      />
    </div>
  );
};

export default ImageManagement;
