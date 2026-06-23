'use client';

import { useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setLoading, accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!_hasHydrated) return;
    if (accessToken) {
      setLoading(false);
      return;
    }

    const restoreSession = async () => {
      try {
        const refreshResponse = await apiClient.post('/auth/refresh');
        const { accessToken: newToken } = refreshResponse.data.data;

        const meResponse = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${newToken}` },
        });
        const user = meResponse.data.data;

        setAuth(user, newToken);
      } catch {
        setLoading(false);
      }
    };

    restoreSession();
  }, [setAuth, setLoading, accessToken, _hasHydrated]);

  return <>{children}</>;
}
