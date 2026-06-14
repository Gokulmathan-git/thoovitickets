'use client';

import { useRouter } from 'next/navigation';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginInput, RegisterInput } from '@thoovitickets/shared';

export function useAuth() {
  const router = useRouter();
  const { setAuth, logout: clearAuth, user, isLoading } = useAuthStore();

  const login = async (data: LoginInput) => {
    const response = await apiClient.post('/auth/login', data);
    const { user, accessToken } = response.data.data;
    setAuth(user, accessToken);
    return user;
  };

  const register = async (data: RegisterInput) => {
    const response = await apiClient.post('/auth/register', data);
    const { user, accessToken } = response.data.data;
    setAuth(user, accessToken);
    return user;
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors during logout
    }
    clearAuth();
    router.push('/login');
  };

  return { user, isLoading, login, register, logout };
}
