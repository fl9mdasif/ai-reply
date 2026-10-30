'use client';

const COOKIE_NAME = 'jba_auth';

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string): void {
  const maxAge = 7 * 24 * 60 * 60; // 7 days
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

export function clearToken(): void {
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/`;
}

export interface TokenPayload {
  sub: string;
  role: 'seller' | 'admin';
  exp: number;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded as TokenPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: TokenPayload): boolean {
  return payload.exp * 1000 < Date.now();
}
