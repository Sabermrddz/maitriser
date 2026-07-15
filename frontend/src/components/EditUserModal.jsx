import React, { useState } from 'react';
import { authFetch } from '../config/authFetch';
import { useTranslation } from '../context/LanguageContext';
import Spinner from './Spinner';
import '../styles/modal.css';

const EditUserModal = ({ user, setShowModal, fetchUsers }) => {
  const { t } = useTranslation();
  const [name, setName]   = useState(user.name || '');
  const [email, setEmail] = useState(user.email || '');
  const [role, setRole]   = useState(user.role || 'user');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await authFetch(`/api/users/${user._id}`, {
        method: 'PUT',
        body: { name, email, role },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update user.');
        return;
      }

      setShowModal(false);
      fetchUsers();
    } catch {
      setError('An error occurred while updating the user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !saving && setShowModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{t('modal.editUser.title')}</h3>
        {error && <div className="error-banner" style={{ marginBottom: 12 }} role="alert">{error}<button onClick={() => setError('')}>&times;</button></div>}
        <label>{t('modal.editUser.name')}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
        <label>{t('modal.editUser.email')}</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={saving} />
        <label>{t('modal.editUser.role')}</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} disabled={saving}>
          <option value="user">{t('modal.editUser.roleUser')}</option>
          <option value="admin">{t('modal.editUser.roleAdmin')}</option>
        </select>
        {saving && <div style={{ textAlign: 'center', marginTop: 8 }}><Spinner size={20} text={t('modal.editUser.saving')} /></div>}
        <div className="modal-buttons">
          <button onClick={() => setShowModal(false)} disabled={saving}>{t('cancel')}</button>
          <button onClick={handleUpdate} disabled={saving}>{saving ? t('modal.editUser.saving') : t('modal.editUser.saveBtn')}</button>
        </div>
      </div>
    </div>
  );
};

export default EditUserModal;
