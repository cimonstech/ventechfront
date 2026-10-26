'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { useAccess } from '@/context/AccessContext';
import { apiMessage, contentRequest, type ContentPageRecord, type ContentStatus } from '@/lib/contentAdmin';

export default function AdminPageEditor() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const { canEdit } = useAccess();
  const editable = canEdit('content');
  const [page, setPage] = useState<ContentPageRecord | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const row = await contentRequest<ContentPageRecord>(`/api/admin/content/pages/${slug}`);
      setPage(row);
      setTitle(row.title);
      setBody(row.body_html || '');
      setStatus(row.status);
    } catch (error) {
      toast.error(apiMessage(error, 'Could not load the page'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (slug) void load();
  }, [slug]);

  const save = async () => {
    if (!title.trim()) {
      toast.error('Enter a title');
      return;
    }
    setSaving(true);
    try {
      await contentRequest(`/api/admin/content/pages/${slug}`, {
        method: 'PUT',
        body: JSON.stringify({ title: title.trim(), body_html: body, status }),
      });
      toast.success('Page saved');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the page'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading page...</p>;
  if (!page) return <p className="text-sm text-gray-500">Page not found.</p>;

  const when = page.updated_at ? new Date(page.updated_at).toLocaleString() : '';
  const who = page.updated_by_name || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{page.title}</h1>
          <p className="text-sm text-gray-500">Last updated by {who} on {when}, version {page.version}</p>
        </div>
        {editable && <Button type="button" size="sm" isLoading={saving} onClick={() => void save()}>Save</Button>}
      </div>
      <label className="block text-sm font-medium text-[#1A1A1A]">
        Title
        <input
          value={title}
          disabled={!editable}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <label className="block text-sm font-medium text-[#1A1A1A]">
        Status
        <select
          value={status}
          disabled={!editable}
          onChange={(event) => setStatus(event.target.value as ContentStatus)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-xs"
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </label>
      <RichTextEditor value={body} editable={editable} onChange={setBody} />
    </div>
  );
}
