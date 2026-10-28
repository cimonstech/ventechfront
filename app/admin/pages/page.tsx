'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { apiMessage, contentRequest, type ContentPageRecord } from '@/lib/contentAdmin';

const PAGE_ORDER = ['terms', 'privacy', 'returns', 'shipping', 'affiliate-terms', 'laptop-banking-terms', 'warranty'];

export default function AdminPagesPage() {
  const [pages, setPages] = useState<ContentPageRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const rows = await contentRequest<ContentPageRecord[]>('/api/admin/content/pages');
        const ordered = [...(rows || [])].sort((a, b) => PAGE_ORDER.indexOf(a.slug) - PAGE_ORDER.indexOf(b.slug));
        setPages(ordered);
      } catch (error) {
        toast.error(apiMessage(error, 'Could not load pages'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#1A1A1A]">Pages</h1>
      <div className="overflow-x-auto sticky-first rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Page</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Version</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3} className="px-4 py-6 text-gray-500">Loading pages...</td></tr>}
            {!loading && pages.map((page) => (
              <tr key={page.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <Link href={`/admin/pages/${page.slug}`} className="font-medium text-[#1A1A1A] underline">{page.title}</Link>
                </td>
                <td className="px-4 py-3 capitalize">{page.status}</td>
                <td className="px-4 py-3">{page.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
