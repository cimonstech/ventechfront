'use client';

import { useEffect, useState } from 'react';
import { contentRequest, type ContentPageRecord } from '@/lib/contentAdmin';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import {
  AdminPageHeader,
  AdminRowCard,
  ResponsiveTable,
  RowActions,
} from '@/components/admin/list';
import { Badge } from '@/components/ui/Badge';

const PAGE_ORDER = ['terms', 'privacy', 'returns', 'shipping', 'affiliate-terms', 'laptop-banking-terms', 'warranty'];

export default function AdminPagesPage() {
  const query = useListQuery();
  const [pages, setPages] = useState<ContentPageRecord[]>([]);

  const load = () =>
    query.run(async () => {
      const rows = await contentRequest<ContentPageRecord[]>('/api/admin/content/pages');
      const ordered = [...(rows || [])].sort((a, b) => PAGE_ORDER.indexOf(a.slug) - PAGE_ORDER.indexOf(b.slug));
      setPages(ordered);
    });

  useEffect(() => {
    void load();
  }, []);

  const pageActions = (page: ContentPageRecord) => [
    { label: 'Edit', href: `/admin/pages/${page.slug}` },
  ];

  if (query.forbidden) {
    return (
      <AccessDenied
        title="You don't have access"
        description="You don't have access to this data."
        primary={{ label: 'Go back', href: '/admin' }}
      />
    );
  }

  if (query.error && !query.loaded) {
    return (
      <ErrorState
        title="We couldn't load pages"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0">
      {query.updating ? <UpdatingNotice /> : null}
      <AdminPageHeader
        title="Pages"
        subtitle={`${pages.length} page${pages.length === 1 ? '' : 's'}`}
      />

      {pages.length === 0 ? (
        <EmptyState title="No pages yet" description="Legal and policy pages will show up here." />
      ) : (
        <ResponsiveTable
          headers={
            <tr>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          }
          cards={pages.map((page) => (
            <AdminRowCard
              key={page.id}
              name={page.title}
              href={`/admin/pages/${page.slug}`}
              status={
                <Badge variant={page.status === 'published' ? 'success' : 'default'} size="sm">
                  {page.status}
                </Badge>
              }
              facts={[
                { label: 'Status', value: page.status },
                { label: 'Version', value: page.version },
              ]}
              actions={<RowActions name={page.title} actions={pageActions(page)} />}
            />
          ))}
        >
          {pages.map((page) => (
            <tr key={page.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-[#1A1A1A]">{page.title}</td>
              <td className="px-4 py-3 capitalize">{page.status}</td>
              <td className="px-4 py-3">{page.version}</td>
              <td className="px-4 py-3 text-right">
                <RowActions name={page.title} actions={pageActions(page)} />
              </td>
            </tr>
          ))}
        </ResponsiveTable>
      )}
    </div>
  );
}
