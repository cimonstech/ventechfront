'use client';

import { useParams } from 'next/navigation';
import { ArticleEditor } from '@/components/admin/ArticleEditor';

export default function EditArticlePage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ArticleEditor articleId={id} />;
}
