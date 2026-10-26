'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useAccess } from '@/context/AccessContext';
import {
  ARTICLE_TYPES,
  apiMessage,
  articleTypeLabel,
  contentRequest,
  targetsSummary,
  type ArticleRecord,
  type ContentStatus,
} from '@/lib/contentAdmin';

export default function AdminContentPage() {
  const { canEdit } = useAccess();
  const editable = canEdit('content');
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (type) params.set('type', type);
      if (status) params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const query = params.toString();
      try {
        const rows = await contentRequest<ArticleRecord[]>(`/api/admin/content/articles${query ? `?${query}` : ''}`);
        setArticles(rows || []);
      } catch (error) {
        toast.error(apiMessage(error, 'Could not load articles'));
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(handle);
  }, [type, status, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-[#1A1A1A]">Content</h1>
        {editable && (
          <Link href="/admin/content/new">
            <Button type="button" size="sm">New article</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search titles"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All types</option>
          {ARTICLE_TYPES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Targets</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="px-4 py-6 text-gray-500">Loading articles...</td></tr>
            )}
            {!loading && articles.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-gray-500">No articles yet.</td></tr>
            )}
            {!loading && articles.map((article) => (
              <tr key={article.id} className="border-t border-gray-100">
                <td className="px-4 py-3 whitespace-nowrap">{articleTypeLabel(article.type)}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/content/${article.id}`} className="font-medium text-[#1A1A1A] underline">
                    {article.title}
                  </Link>
                </td>
                <td className="px-4 py-3 capitalize">{article.status as ContentStatus}</td>
                <td className="px-4 py-3">{targetsSummary(article.targets)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{article.updated_at ? new Date(article.updated_at).toLocaleString() : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
