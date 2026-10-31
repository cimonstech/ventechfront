'use client';

import { useCallback, useRef, useState } from 'react';
import { noteQueryFail } from '@/lib/queryState';

export function useListQuery() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [featureOff, setFeatureOff] = useState(false);
  const loadedRef = useRef(false);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (loadedRef.current) setUpdating(true);
    else setLoading(true);
    try {
      const value = await fn();
      loadedRef.current = true;
      setLoaded(true);
      setError(false);
      setForbidden(false);
      setFeatureOff(false);
      return value;
    } catch (err) {
      const kind = noteQueryFail(err);
      if (kind === 'feature_off') setFeatureOff(true);
      else if (kind === 'forbidden') setForbidden(true);
      else if (kind !== 'unauthorized') setError(true);
      return undefined;
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  return { loaded, loading, updating, error, forbidden, featureOff, run };
}
