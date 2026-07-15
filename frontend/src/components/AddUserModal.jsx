import React, { useState } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { logger } from '../utils/logger';
import { fetchWithAuth, API_BASE_URL } from '../config/api';
import '../styles/modal.css';

const AddUserModal = ({ setShowModal, fetchUsers }) => {
  const { t } = useTranslation();
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    role: 'user',
  });
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/api/users`, {
        method: 'POST',
        body: userData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const { tempPassword: tp, userId: genUid } = data;

      if (tp) {
        setTempPassword(tp);
        if (genUid) { try { localStorage.setItem('lastGenUserId', genUid); } catch {} }
      } else {
        fetchUsers();
        setShowModal(false);
      }
    } catch (error) {
      const msg = error.message || 'Error adding user.';
      logger.error({ err: error }, `AddUserModal failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // After showing the temp password, close and refresh
  if (tempPassword) {
    const genUid = (() => { try { return localStorage.getItem('lastGenUserId'); } catch { return null; } })();
    return (
      <div className="modal-overlay" onClick={() => { try { localStorage.removeItem('lastGenUserId'); } catch {} fetchUsers(); setShowModal(false); }}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>{t('modal.addUser.created')}</h3>
          {genUid && <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>{t('modal.addUser.userId', { id: genUid })}</p>}
          <p>{t('modal.addUser.tempPasswordHint')}</p>
          <code style={{ display: 'block', padding: '12px', background: 'var(--dc-cream)', borderRadius: '4px', fontSize: '16px', margin: '12px 0' }}>
            {tempPassword}
          </code>
          <button onClick={() => { try { localStorage.removeItem('lastGenUserId'); } catch {} fetchUsers(); setShowModal(false); }}>{t('modal.addUser.close')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => !loading && setShowModal(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{t('modal.addUser.title')}</h3>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">{t('modal.addUser.name')}</label>
            <input type="text" id="name" name="name" value={userData.name} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label htmlFor="email">{t('modal.addUser.email')}</label>
            <input type="email" id="email" name="email" value={userData.email} onChange={handleChange} required />
          </div>
          <div className="input-group">
            <label htmlFor="role">{t('modal.addUser.role')}</label>
            <select id="role" name="role" value={userData.role} onChange={handleChange}>
              <option value="user">{t('modal.addUser.roleUser')}</option>
              <option value="admin">{t('modal.addUser.roleAdmin')}</option>
            </select>
          </div>
          <button type="submit" disabled={loading}>{loading ? t('modal.addUser.adding') : t('modal.addUser.addBtn')}</button>
        </form>
        <button className="close-btn" onClick={() => setShowModal(false)}>{t('cancel')}</button>
      </div>
    </div>
  );
};

export default AddUserModal;
