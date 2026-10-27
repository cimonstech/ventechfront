'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type AdminHeading = { title: string; id: string | null } | null;

const AdminHeadingContext = createContext<{
  heading: AdminHeading;
  setHeading: (value: AdminHeading) => void;
} | null>(null);

export function AdminHeadingProvider({ children }: { children: ReactNode }) {
  const [heading, setHeadingState] = useState<AdminHeading>(null);
  const setHeading = useCallback((value: AdminHeading) => {
    setHeadingState(value);
  }, []);
  const value = useMemo(() => ({ heading, setHeading }), [heading, setHeading]);
  return <AdminHeadingContext.Provider value={value}>{children}</AdminHeadingContext.Provider>;
}

export function useAdminHeadingValue(): AdminHeading {
  return useContext(AdminHeadingContext)?.heading ?? null;
}

export function useSetAdminHeading(title: string | null, id: string | null = null) {
  const setHeading = useContext(AdminHeadingContext)?.setHeading;
  useEffect(() => {
    if (!setHeading) return;
    if (!title) {
      setHeading(null);
      return;
    }
    setHeading({ title, id });
    return () => setHeading(null);
  }, [setHeading, title, id]);
}
