import React, { useState, useEffect, useRef, useMemo } from 'react';
import { authFetch } from '../config/authFetch';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../components/Toast';
import { useSound } from '../context/SoundContext';
import { logger } from '../utils/logger';
import useDocumentTitle from '../utils/useDocumentTitle';
import { useTranslation } from '../context/LanguageContext';
import '../styles/userManagement.css';
import { FaSearch, FaEdit, FaTrash, FaHistory } from 'react-icons/fa';
import AddUserModal from '../components/AddUserModal';
import EditUserModal from '../components/EditUserModal';
import ConfirmModal from '../components/ConfirmModal';
import Spinner from '../components/Spinner';
import Pagination from '../components/Pagination';
import UserHistoryModal from '../components/UserHistoryModal';

const UserManagement = () => {
  const { t } = useTranslation();
  useDocumentTitle(t('admin.user.title'), 'Admin');
  const notify = useToast();
  const play = useSound();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [historyUser, setHistoryUser] = useState(null);
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async (p) => {
    const pg = p ?? page;
    setLoading(true);
    try {
      const response = await authFetch(`/api/users?page=${pg}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const d = await response.json();
      setUsers(d.data || (Array.isArray(d) ? d : []));
      setPage(d.page || 1);
      setTotalPages(d.totalPages || 1);
      setError('');
    } catch (error) {
      logger.error({ err: error }, 'UserManagement fetchUsers failed');
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(1); }, []);

  const filteredUsers = useMemo(() => {
    if (users.length > 0) {
      return users.filter(user =>
        (user.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return [];
  }, [search, users]);

  const handleSync = async () => {
    play('submit');
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/admin/sync-all-users', { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        notify(t('admin.user.syncDone', { count: d.synced }), 'success');
        fetchUsers(1);
      } else {
        notify(t('admin.user.syncFailed'), 'error');
      }
    } catch (err) { logger.error({ err }, 'UserManagement sync-from-clerk failed'); notify(t('admin.user.syncFailed'), 'error'); }
    finally { submittingRef.current = false; setSubmitting(false); }
  };

  const handleDelete = async () => {
    play('delete');
    if (!deleteTarget || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await authFetch(`/api/users/${deleteTarget._id}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        notify(`Error: ${errorData.message || t('admin.user.deleteError')}`, 'error');
        return;
      }
      setUsers(prev => prev.filter(user => user._id !== deleteTarget._id));
      notify(t('admin.user.deleted'), 'success');
    } catch (err) {
      logger.error({ err }, 'UserManagement handleDelete failed');
      notify(t('admin.user.deleteError'), 'error');
    } finally {
      setDeleteTarget(null);
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleAddUser = () => {
    setIsAddingUser(true);
    setShowModal(true);
  };

  if (loading) return <div className="user-management-container"><h2>{t('admin.user.title')}</h2><Spinner /></div>;

  return (
    <div className="user-management-container">
      {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')}>&times;</button></div>}

      <div className="header">
        <h2>{t('admin.user.title')}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="add-user-btn" onClick={handleSync} disabled={submitting} style={{ background: 'var(--dc-dark)' }}>
            {t('admin.user.syncFromClerk')}
          </button>
          <button type="button" className="add-user-btn" onClick={handleAddUser}>
            {t('admin.user.addUser')}
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={t('admin.user.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('admin.user.searchPlaceholder')}
        />
        <FaSearch />
      </div>

      {!loading && <Pagination page={page} pages={totalPages} onPageChange={(p) => fetchUsers(p)} />}
      <div className="user-table-wrapper">
      <table className="user-table">
        <thead>
          <tr>
            <th>{t('admin.user.tableName')}</th>
            <th>{t('admin.user.tableEmail')}</th>
            <th>{t('admin.user.tableRole')}</th>
            <th>{t('admin.user.tableActions')}</th>
          </tr>
        </thead>
        <tbody>
          {filteredUsers.length > 0 ? (
            filteredUsers.map(user => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <button type="button" onClick={() => setHistoryUser(user)} className="history-btn" title={t('userHistory.viewResults')}><FaHistory /></button>
                  <button type="button" onClick={() => handleEdit(user)} className="edit-btn"><FaEdit /></button>
                  <button type="button" onClick={() => setDeleteTarget(user)} className="delete-btn"><FaTrash /></button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="4" className="admin-empty">{t('admin.user.noUsers')}</td></tr>
          )}
        </tbody>
      </table>
      </div>

      {isAddingUser && showModal && <AddUserModal setShowModal={setShowModal} fetchUsers={fetchUsers} />}
      {!isAddingUser && showModal && selectedUser && (
        <EditUserModal user={selectedUser} setShowModal={setShowModal} fetchUsers={fetchUsers} />
      )}

      {historyUser && <UserHistoryModal user={historyUser} onClose={() => setHistoryUser(null)} />}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('admin.user.deleteConfirm')}
        message={t('admin.user.deleteConfirmMsg', { name: deleteTarget?.name || '' })}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        confirmText={t('admin.user.deleteBtn')}
        confirmDisabled={submitting}
      />
    </div>
  );
};

export default UserManagement;
