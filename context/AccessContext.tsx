'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAppSelector } from '@/store';
import { authHeaders } from '@/lib/authHeaders';
import {
  AccessModule,
  AccessProfile,
  canEditModule,
  canViewModule,
  fullAdminAccess,
} from '@/lib/access';

interface AccessContextValue {
  access: AccessProfile | null;
  loading: boolean;
  canView: (module: AccessModule) => boolean;
  canEdit: (module: AccessModule) => boolean;
}

const AccessContext = createContext<AccessContextValue>({
  access: null,
  loading: false,
  canView: () => false,
  canEdit: () => false,
});

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const [access, setAccess] = useState<AccessProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setAccess(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/me/access`, {
          headers: await authHeaders(),
        });
        const payload = await response.json();
        if (!response.ok || payload.success === false) {
          throw new Error(payload.message || 'Failed to load access');
        }
        if (!cancelled) setAccess(payload.data);
      } catch (error) {
        console.error('Error loading access:', error);
        if (!cancelled) {
          if (user.role === 'admin' || user.role === 'superadmin') {
            setAccess(fullAdminAccess(user.role));
          } else {
            setAccess(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id, user?.role]);

  const value: AccessContextValue = {
    access,
    loading,
    canView: (module) => canViewModule(access, module),
    canEdit: (module) => canEditModule(access, module),
  };

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  return useContext(AccessContext);
}
