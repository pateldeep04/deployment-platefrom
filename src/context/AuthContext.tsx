import React, { createContext, useContext, useState, useEffect } from 'react';
import { IUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(() => {
    const cached = localStorage.getItem('deployhub_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('deployhub_access_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(res.data.data.user);
        localStorage.setItem('deployhub_user', JSON.stringify(res.data.data.user));
      }
    } catch (e) {
      console.warn('Could not refresh user session');
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser().finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success) {
      const { user: authUser, tokens } = res.data.data;
      setUser(authUser);
      setToken(tokens.accessToken);
      localStorage.setItem('deployhub_user', JSON.stringify(authUser));
      localStorage.setItem('deployhub_access_token', tokens.accessToken);
      localStorage.setItem('deployhub_refresh_token', tokens.refreshToken);
    } else {
      throw new Error(res.data.error || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post('/auth/register', { name, email, password });
    if (res.data.success) {
      const { user: authUser, tokens } = res.data.data;
      setUser(authUser);
      setToken(tokens.accessToken);
      localStorage.setItem('deployhub_user', JSON.stringify(authUser));
      localStorage.setItem('deployhub_access_token', tokens.accessToken);
      localStorage.setItem('deployhub_refresh_token', tokens.refreshToken);
    } else {
      throw new Error(res.data.error || 'Registration failed');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('deployhub_user');
    localStorage.removeItem('deployhub_access_token');
    localStorage.removeItem('deployhub_refresh_token');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        isAdmin: user?.role === 'ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
