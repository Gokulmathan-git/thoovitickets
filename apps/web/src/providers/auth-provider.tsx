'use client';

import { useEffect } from 'react';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, setLoading } = useAuthStore();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const refreshResponse = await apiClient.post('/auth/refresh');
        const { accessToken } = refreshResponse.data.data;

        const meResponse = await apiClient.get('/auth/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const user = meResponse.data.data;

        setAuth(user, accessToken);
      } catch {
        setLoading(false);
      }
    };

    restoreSession();
  }, [setAuth, setLoading]);

  return <>{children}</>;
}
