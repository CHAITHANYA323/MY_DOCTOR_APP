import React, { useState, useEffect } from 'react';
import { FaUsers, FaUserShield, FaUser, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';
import { authService } from '../../services/authService';

export const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await authService.getUsers();
        if (res.success) {
          setUsers(res.users);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
          Registered User Accounts
        </h1>
        <p style={{ color: 'var(--slate-500)', fontSize: '0.9rem' }}>
          Overview of registered patients and administrator profiles
        </p>
      </div>

      <div className="table-responsive card">
        {loading ? (
          <div style={{ padding: '2rem' }}>Loading user profiles...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Access Role</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>#{u.id}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <img 
                        src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}&background=0284c7&color=fff`} 
                        alt={u.name}
                        style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} 
                      />
                      <span style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{u.name}</span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.phone || '—'}</td>
                  <td>
                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-confirmed' : 'badge-available'}`}>
                      {u.role === 'ADMIN' ? 'Administrator' : 'Patient'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--slate-500)' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
