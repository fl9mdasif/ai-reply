'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, clearToken, decodeToken, isTokenExpired, type TokenPayload } from '@/lib/auth';

interface AuthState {
  sellerId: string | null;
  role: 'seller' | 'admin' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    sellerId: null,
    role: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setState({ sellerId: null, role: null, isLoading: false, isAuthenticated: false });
      return;
    }
    const payload: TokenPayload | null = decodeToken(token);
    if (!payload || isTokenExpired(payload)) {
      clearToken();
      setState({ sellerId: null, role: null, isLoading: false, isAuthenticated: false });
      return;
    }
    setState({
      sellerId: payload.sub,
      role: payload.role,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState({ sellerId: null, role: null, isLoading: false, isAuthenticated: false });
    window.location.href = '/en/auth/login';
  }, []);

  return { ...state, logout };
}
