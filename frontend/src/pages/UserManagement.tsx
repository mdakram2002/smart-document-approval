import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import type { User } from '../types';
import { UserCheck, UserX } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  }, []);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  const toggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      setError('');
      await api.patch(`/users/${userId}/status`, {
        status: currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      });
      await fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update user status.');
    }
  };

  const changeRole = async (userId: string, role: User['role']) => {
    try {
      setError('');
      await api.patch(`/users/${userId}`, { role });
      await fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to update user role.');
      await fetchUsers();
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'SUBMITTER':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>
      {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <select aria-label={`Role for ${user.name}`} value={user.role} onChange={(event) => void changeRole(user.id, event.target.value as User['role'])} className="mr-3 rounded border border-gray-300 px-2 py-1">
                    <option value="SUBMITTER">Submitter</option>
                    <option value="APPROVER">Approver</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button
                    onClick={() => toggleUserStatus(user.id, user.status)}
                    className="text-blue-600 hover:text-blue-900"
                    title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  >
                    {user.status === 'ACTIVE' ? (
                      <UserX className="w-5 h-5" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
