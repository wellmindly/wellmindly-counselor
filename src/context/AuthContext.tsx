import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  timezone?: string;
  counselorProfile?: any;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  profile: any | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('counselor_token'));
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!localStorage.getItem('counselor_token')) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/counselors/me/profile');
      if (res.data.success) {
        setProfile(res.data.data);
        setUser(res.data.data.user);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, [token]);

  const login = (newToken: string, userData: User) => {
    localStorage.setItem('counselor_token', newToken);
    setToken(newToken);
    setUser(userData);
    refreshProfile();
  };

  const logout = () => {
    localStorage.removeItem('counselor_token');
    setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, profile, login, logout, refreshProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
