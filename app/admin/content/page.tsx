'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { AccessDenied, EmptyState, ErrorState, NoResults, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import { useAccess } from '@/context/AccessContext';
import {
  ARTICLE_TYPES,
  articleTypeLabel,
  contentRequest,
  targetsSummary,
  type ArticleRecord,
  type ContentStatus,
} from '@/lib/contentAdmin';
import {
  AdminPageHeader,
  AdminRowCard,
  FilterBar,
  filterSelectClassName,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { Badge } from '@/components/ui/Badge';

export default function AdminContentPage() {
  const { canEdit } = useAccess();
  const editable = canEdit('content');
  const listQuery = useListQuery();
  const [articles, setArticles] = useState<ArticleRecord[]>([]);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (search.trim()) params.set('search', search.trim());
    const query = params.toString();
    return listQuery.run(async () => {
      const rows = await contentRequest<ArticleRecord[]>(`/api/admin/content/articles${query ? `?${query}` : ''}`);
      setArticles(rows || []);
    });
  };

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [type, status, search]);

  const hasFilters = Boolean(type || status || search.trim());

  const articleActions = (article: ArticleRecord) => [
    { label: 'Edit', href: `/admin/content/${article.id}` },
  ];

  if (listQuery.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (listQuery.error && !listQuery.loaded) {
    return (
      <ErrorState
        title="We couldn't load articles"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }

  if (listQuery.loading && !listQuery.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0">
      {listQuery.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Content"
        subtitle={`${articles.length} article${articles.length === 1 ? '' : 's'}`}
        primary={
          editable
            ? { label: 'New article', icon: <Plus size={16} />, href: '/admin/content/new' }
            : undefined
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search titles"
        activeCount={[type, status].filter(Boolean).length}
        onClear={() => {
          setType('');
          setStatus('');
        }}
      >
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className={filterSelectClassName()}
        >
          <option value="">All types</option>
          {ARTICLE_TYPES.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={filterSelectClassName()}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </FilterBar>

      {articles.length === 0 ? (
        hasFilters ? (
          <NoResults
            primary={{
              label: 'Clear filters',
              onClick: () => {
                setType('');
                setStatus('');
                setSearch('');
              },
            }}
          />
        ) : (
          <EmptyState
            title="No articles yet"
            description="Write a guide or help article for the store or device portal."
            primary={editable ? { label: 'New article', href: '/admin/content/new' } : undefined}
          />
        )
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Targets</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={articles.map((article) => (
            <AdminRowCard
              key={article.id}
              name={article.title}
              href={`/admin/content/${article.id}`}
              status={
                <Badge variant={article.status === 'published' ? 'success' : 'default'} size="sm">
                  {article.status as ContentStatus}
                </Badge>
              }
              facts={[
                { label: 'Type', value: articleTypeLabel(article.type) },
                { label: 'Targets', value: targetsSummary(article.targets) },
                {
                  label: 'Updated',
                  value: article.updated_at ? new Date(article.updated_at).toLocaleString() : '',
                },
              ]}
              actions={<RowActions name={article.title} actions={articleActions(article)} />}
            />
          ))}
        >
          {articles.map((article) => (
            <tr key={article.id} className="hover:bg-gray-50">
              <td className="whitespace-nowrap px-4 py-3">{articleTypeLabel(article.type)}</td>
              <td className="px-4 py-3 font-medium text-[#1A1A1A]">{article.title}</td>
              <td className="px-4 py-3 capitalize">{article.status as ContentStatus}</td>
              <td className="px-4 py-3">{targetsSummary(article.targets)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {article.updated_at ? new Date(article.updated_at).toLocaleString() : ''}
              </td>
              <td className="px-4 py-3 text-right">
                <RowActions name={article.title} actions={articleActions(article)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </div>
  );
}
