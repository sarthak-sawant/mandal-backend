import React, { createContext, useState, useEffect, useContext } from 'react';
import { safeStorage as AsyncStorage } from '../services/storage';
import { api, getApiServerIp, setApiServerIp } from '../services/api';
import { router } from 'expo-router';

interface User {
  id: number;
  name: string;
  phone: string;
  role: 'admin' | 'member' | 'treasurer';
  designation: string;
  joinedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string, designation?: string) => Promise<void>;
  logout: () => Promise<void>;
  serverIp: string;
  serverPort: string;
  updateServerIp: (ip: string, port?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverIp, setServerIp] = useState('10.0.2.2');
  const [serverPort, setServerPort] = useState('3000');

  useEffect(() => {
    async function loadStoredAuth() {
      const startTime = Date.now();
      // Load user profile & token
      try {
        const storedToken = await AsyncStorage.getItem('mandal_auth_token');
        const storedUser = await AsyncStorage.getItem('mandal_user_profile');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load stored auth details', e);
      }

      // Load server IP configurations
      try {
        const ipConfig = await getApiServerIp();
        setServerIp(ipConfig.ip);
        setServerPort(ipConfig.port);
      } catch (e) {
        console.error('Failed to load stored IP config', e);
      } finally {
        const elapsed = Date.now() - startTime;
        const remainingDelay = Math.max(0, 3000 - elapsed);
        setTimeout(() => {
          setIsLoading(false);
        }, remainingDelay);
      }
    }
    loadStoredAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    const response = await api.login(phone, password);
    setIsLoading(true);
    setTimeout(() => {
      setUser(response.user);
      setToken(response.token);
      setIsLoading(false);
    }, 1000);
  };

  const register = async (name: string, phone: string, password: string, designation?: string) => {
    const response = await api.register(name, phone, password, designation);
    setIsLoading(true);
    setTimeout(() => {
      setUser(response.user);
      setToken(response.token);
      setIsLoading(false);
    }, 1000);
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      setToken(null);
      router.replace('/');
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const updateServerIp = async (ip: string, port = '3000') => {
    await setApiServerIp(ip, port);
    setServerIp(ip);
    setServerPort(port);
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    serverIp,
    serverPort,
    updateServerIp,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
