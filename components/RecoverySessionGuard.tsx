'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  RECOVERY_ONLY_EVENT,
  clearRecoveryOnly,
  hashRecoveryType,
  isRecoveryOnly,
  markRecoveryOnly,
} from '@/lib/recoverySession';

interface RecoverySessionValue {
  recoveryOnly: boolean;
  mark: () => void;
  clear: () => void;
}

const RecoverySessionContext = createContext<RecoverySessionValue>({
  recoveryOnly: false,
  mark: markRecoveryOnly,
  clear: clearRecoveryOnly,
});

export function useRecoverySession(): RecoverySessionValue {
  return useContext(RecoverySessionContext);
}

export function RecoverySessionGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [recoveryOnly, setRecoveryOnly] = useState(false);

  const sync = useCallback(() => {
    setRecoveryOnly(isRecoveryOnly());
  }, []);

  const mark = useCallback(() => {
    markRecoveryOnly();
    setRecoveryOnly(true);
  }, []);

  const clear = useCallback(() => {
    clearRecoveryOnly();
    setRecoveryOnly(false);
  }, []);

  useLayoutEffect(() => {
    if (hashRecoveryType()) markRecoveryOnly();
    sync();
  }, [sync]);

  useEffect(() => {
    const onFlag = () => sync();
    window.addEventListener(RECOVERY_ONLY_EVENT, onFlag);
    return () => window.removeEventListener(RECOVERY_ONLY_EVENT, onFlag);
  }, [sync]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') mark();
      if (event === 'SIGNED_OUT') clear();
    });
    return () => subscription.unsubscribe();
  }, [mark, clear]);

  useEffect(() => {
    if (!recoveryOnly) return;
    if (pathname === '/reset-password') return;
    router.replace('/reset-password');
  }, [recoveryOnly, pathname, router]);

  const value = useMemo(
    () => ({ recoveryOnly, mark, clear }),
    [recoveryOnly, mark, clear]
  );

  return (
    <RecoverySessionContext.Provider value={value}>
      {children}
    </RecoverySessionContext.Provider>
  );
}
