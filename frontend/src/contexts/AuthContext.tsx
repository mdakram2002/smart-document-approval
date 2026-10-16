import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { AuthContext, type AuthResponse, type User } from './AuthState';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('accessToken')));

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    let active = true;
    api.get<User>('/auth/me')
      .then(({ data }) => {
        if (!active) return;
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    const { user: userData, accessToken } = response.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (email: string, password: string, name: string) => {
    await api.post('/auth/register', { email, password, name });
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { timeout: 5000 });
    } catch {
      // Always clear the local session, including when the API is unreachable.
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
