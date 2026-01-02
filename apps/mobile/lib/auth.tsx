import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, User } from './api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        api.setToken(token);
        const response = await api.getMe();
        if (response.success) {
          setUser(response.data);
        } else {
          api.setToken(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success) {
      setUser(response.data.user);
    } else {
      throw new Error('Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await api.register(email, password, name);
    if (response.success) {
      setUser(response.data.user);
    } else {
      throw new Error('Registration failed');
    }
  };

  const logout = async () => {
    api.setToken(null);
    setUser(null);
  };

  const updateUser = async (data: Partial<User>) => {
    const response = await api.updateProfile(data);
    if (response.success) {
      setUser(response.data);
    }
  };

  const refreshUser = async () => {
    const response = await api.getMe();
    if (response.success) {
      setUser(response.data);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}



