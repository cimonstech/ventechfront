'use client';

import { useCallback, useEffect, useState } from 'react';
import { FaqBrowser } from '@/components/content/FaqBrowser';
import { EmptyState, LoadGate } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { apiRequest, toApiError } from '@/lib/api';
import type { PublicFaqCategory } from '@/lib/publicContent';

export function FaqList() {
  const [categories, setCategories] = useState<PublicFaqCategory[]>([]);
  const query = useListQuery();

  const load = useCallback(() => {
    return query.run(async () => {
      const result = await apiRequest<PublicFaqCategory[]>('/api/content/faqs');
      if (!result.ok) throw toApiError(result);
      setCategories(result.data || []);
    });
  }, [query.run]);

  useEffect(() => {
    void load();
  }, [load]);

  const questions = categories.flatMap((category) => category.faqs || []);

  return (
    <LoadGate
      loaded={query.loaded}
      loading={query.loading}
      updating={query.updating}
      error={query.error}
      isEmpty={questions.length === 0}
      onRetry={() => void load()}
      emptyTitle="No questions yet"
      emptyDescription="If you need help now, send us a message and we'll get back to you."
      emptyPrimary={{ label: 'Contact us', href: '/contact' }}
    >
      {categories.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="If you need help now, send us a message and we'll get back to you."
          primary={{ label: 'Contact us', href: '/contact' }}
        />
      ) : (
        <FaqBrowser categories={categories} />
      )}
    </LoadGate>
  );
}
