'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { useAccess } from '@/context/AccessContext';
import { supabase } from '@/lib/supabase';
import { authHeaders } from '@/lib/authHeaders';
import {
  ARTICLE_TYPES,
  apiMessage,
  contentRequest,
  savedAtLabel,
  type ArticleRecord,
  type ArticleType,
  type ContentStatus,
  type ContentTarget,
} from '@/lib/contentAdmin';
import { OPERATING_SYSTEMS, PRODUCT_CONDITIONS } from '@/lib/portalTargeting';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface NamedItem {
  id: string;
  name: string;
  hint?: string;
}

interface ProductRow {
  id: string;
  name: string;
  category?: { name?: string } | null;
}

function fileNameFromUrl(url: string): string {
  try {
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
    return name || 'Attachment.pdf';
  } catch {
    return 'Attachment.pdf';
  }
}

function toProduct(row: ProductRow): NamedItem {
  return { id: row.id, name: row.name, hint: row.category?.name };
}

function mergeItems(current: NamedItem[], incoming: NamedItem[]): NamedItem[] {
  const merged = [...current];
  incoming.forEach((item) => {
    if (!merged.some((existing) => existing.id === item.id)) merged.push(item);
  });
  return merged;
}

function slugify(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || 'item';
}

function fieldClass() {
  return 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#1A1A1A] focus:border-[#FF7A19] focus:outline-none';
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  onSearch,
  disabled,
  emptyLabel = 'Nothing to show',
  remote = false,
}: {
  label: string;
  options: NamedItem[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onSearch?: (query: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  remote?: boolean;
}) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const filtered = remote
    ? options
    : options.filter((option) => {
      if (!needle) return true;
      return option.name.toLowerCase().includes(needle) || (option.hint || '').toLowerCase().includes(needle);
    });

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-[#1A1A1A]">{label}</p>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {selected.map((id) => {
            const option = options.find((item) => item.id === id);
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onChange(selected.filter((value) => value !== id))}
                className="rounded-full bg-orange-50 px-2 py-1 text-xs text-[#1A1A1A]"
              >
                {option?.name || 'Selected'}{option?.hint ? ` · ${option.hint}` : ''} ×
              </button>
            );
          })}
        </div>
      )}
      <input
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value);
          onSearch?.(event.target.value);
        }}
        placeholder={`Search ${label.toLowerCase()}`}
        className={fieldClass()}
      />
      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-200 p-2">
        {filtered.length === 0 && <p className="text-xs text-gray-500">{emptyLabel}</p>}
        {filtered.map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label key={option.id} className="flex items-start gap-2 text-sm text-[#1A1A1A]">
              <input
                type="checkbox"
                className="mt-1"
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  onChange(checked ? selected.filter((id) => id !== option.id) : [...selected, option.id]);
                }}
              />
              <span className="min-w-0">
                <span className="block truncate">{option.name}</span>
                {option.hint && <span className="block truncate text-xs text-gray-500">{option.hint}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function ArticleEditor({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const { canEdit } = useAccess();
  const editable = canEdit('content');
  const [loading, setLoading] = useState(Boolean(articleId));
  const [missing, setMissing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [id, setId] = useState(articleId || '');
  const [type, setType] = useState<ArticleType>('user_guide');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [allLaptops, setAllLaptops] = useState(false);
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [appliesOs, setAppliesOs] = useState<string[]>([]);
  const [appliesCondition, setAppliesCondition] = useState<string[]>([]);
  const [brands, setBrands] = useState<NamedItem[]>([]);
  const [categories, setCategories] = useState<NamedItem[]>([]);
  const [products, setProducts] = useState<NamedItem[]>([]);
  const [preview, setPreview] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const pdfRef = useRef<HTMLInputElement>(null);
  const productSearchTimer = useRef<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const slugTouched = useRef(false);
  const dirtyRef = useRef(false);
  const inFlight = useRef(false);
  const saveRef = useRef<() => void>(() => {});
  const canEditRef = useRef(editable);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  useEffect(() => {
    canEditRef.current = editable;
  }, [editable]);

  const markDirty = () => {
    dirtyRef.current = true;
    setDirty(true);
  };

  const targetsPayload = useCallback((): ContentTarget[] => {
    if (allLaptops) return [{ target_type: 'all' }];
    return [
      ...brandIds.map((targetId) => ({ target_type: 'brand' as const, target_id: targetId })),
      ...categoryIds.map((targetId) => ({ target_type: 'category' as const, target_id: targetId })),
      ...productIds.map((targetId) => ({ target_type: 'product' as const, target_id: targetId })),
    ];
  }, [allLaptops, brandIds, categoryIds, productIds]);

  const applyArticle = (article: ArticleRecord) => {
    setId(article.id);
    setType(article.type);
    setTitle(article.title);
    setSlug(article.slug);
    setSummary(article.summary || '');
    setBody(article.body_html || '');
    setAttachmentUrl(article.attachment_url || '');
    setSortOrder(article.sort_order || 0);
    setStatus(article.status);
    const targets = article.targets || [];
    setAllLaptops(targets.some((target) => target.target_type === 'all'));
    setBrandIds(targets.filter((target) => target.target_type === 'brand' && target.target_id).map((target) => target.target_id as string));
    setCategoryIds(targets.filter((target) => target.target_type === 'category' && target.target_id).map((target) => target.target_id as string));
    setProductIds(targets.filter((target) => target.target_type === 'product' && target.target_id).map((target) => target.target_id as string));
    setAppliesOs(article.applies_to_os || []);
    setAppliesCondition(article.applies_to_condition || []);
    slugTouched.current = true;
    dirtyRef.current = false;
    setDirty(false);
    if (article.updated_at) setSavedAt(new Date(article.updated_at));
  };

  const save = useCallback(async (options?: {
    status?: ContentStatus;
    silent?: boolean;
    keepalive?: boolean;
    notice?: string;
  }) => {
    if (!canEditRef.current) return;
    const nextStatus = options?.status ?? status;
    if (!title.trim()) {
      if (!options?.silent) toast.error('Enter a title');
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const payload = {
        type,
        title: title.trim(),
        slug: slug.trim(),
        summary: summary.trim() || null,
        body_html: body,
        attachment_url: attachmentUrl.trim() || null,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        status: nextStatus,
        applies_to_os: appliesOs.length ? appliesOs : null,
        applies_to_condition: appliesCondition.length ? appliesCondition : null,
        targets: targetsPayload(),
      };
      const path = id ? `/api/admin/content/articles/${id}` : '/api/admin/content/articles';
      const saved = await contentRequest<ArticleRecord>(path, {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
        keepalive: options?.keepalive,
      });
      setStatus(nextStatus);
      dirtyRef.current = false;
      setDirty(false);
      const when = new Date();
      setSavedAt(when);
      if (!options?.silent) {
        toast.success(options?.notice || (nextStatus === 'published' ? 'Article published' : 'Draft saved'));
      }
      if (!id && saved?.id) {
        setId(saved.id);
        router.replace(`/admin/content/${saved.id}`);
      }
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the article'));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }, [appliesCondition, appliesOs, attachmentUrl, body, id, router, slug, sortOrder, status, summary, targetsPayload, title, type]);

  useEffect(() => {
    saveRef.current = () => {
      if (!dirtyRef.current || !canEditRef.current) return;
      void save({ silent: true, keepalive: true });
    };
  }, [save]);

  useEffect(() => {
    const tick = () => saveRef.current();
    const interval = window.setInterval(tick, 30000);
    window.addEventListener('pagehide', tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', tick);
      tick();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadOptions = async () => {
      const { data: brandRows, error: brandError } = await supabase.from('brands').select('id, name').order('name');
      if (brandError) toast.error(brandError.message || 'Could not load brands');
      else if (!cancelled) setBrands((brandRows || []) as NamedItem[]);

      try {
        const categoryRows = await contentRequest<NamedItem[]>('/api/products/categories');
        if (!cancelled) {
          setCategories((categoryRows || []).map((row) => ({ id: row.id, name: row.name })));
        }
      } catch (error) {
        toast.error(apiMessage(error, 'Could not load categories'));
      }

      try {
        const rows = await contentRequest<ProductRow[]>('/api/products?limit=30');
        if (!cancelled) setProducts((current) => mergeItems(current, (rows || []).map(toProduct)));
      } catch (error) {
        toast.error(apiMessage(error, 'Could not load products'));
      }
    };
    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!articleId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const article = await contentRequest<ArticleRecord>(`/api/admin/content/articles/${articleId}`);
        if (cancelled) return;
        applyArticle(article);
        const selectedProducts = (article.targets || [])
          .filter((target) => target.target_type === 'product' && target.target_id)
          .map((target) => target.target_id as string);
        if (selectedProducts.length > 0) {
          const { data, error } = await supabase.from('products').select('id, name').in('id', selectedProducts);
          if (error) toast.error(error.message || 'Could not load products');
          else if (!cancelled) setProducts((current) => mergeItems(current, (data || []) as NamedItem[]));
        }
      } catch (error) {
        if (!cancelled) {
          setMissing(true);
          toast.error(apiMessage(error, 'Could not load the article'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  const searchProducts = async (query: string) => {
    const term = query.trim();
    if (!term) {
      try {
        const rows = await contentRequest<ProductRow[]>('/api/products?limit=30');
        setProducts((current) => {
          const selected = current.filter((item) => productIds.includes(item.id));
          return mergeItems(selected, (rows || []).map(toProduct));
        });
      } catch (error) {
        toast.error(apiMessage(error, 'Could not load products'));
      }
      return;
    }

    try {
      const requests = [
        contentRequest<ProductRow[]>(`/api/products?search=${encodeURIComponent(term)}&limit=30`),
      ];
      categories
        .filter((category) => category.name.toLowerCase().includes(term.toLowerCase()))
        .forEach((category) => {
          requests.push(contentRequest<ProductRow[]>(`/api/products?category=${category.id}&limit=30`));
        });
      const groups = await Promise.all(requests);
      const found = groups.flatMap((rows) => (rows || []).map(toProduct));
      setProducts((current) => {
        const selected = current.filter((item) => productIds.includes(item.id));
        return mergeItems(selected, found);
      });
    } catch (error) {
      toast.error(apiMessage(error, 'Could not search products'));
    }
  };

  const queueProductSearch = (query: string) => {
    if (productSearchTimer.current) window.clearTimeout(productSearchTimer.current);
    productSearchTimer.current = window.setTimeout(() => {
      void searchProducts(query);
    }, 300);
  };

  const uploadPdf = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Choose a PDF file');
      return;
    }
    setUploadingPdf(true);
    try {
      const headers = await authHeaders();
      const form = new FormData();
      form.append('file', file);
      const response = await fetch(`${API_URL}/api/upload/single?folder=content`, {
        method: 'POST',
        headers,
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.url !== 'string') {
        const message = typeof result.message === 'string'
          ? result.message
          : typeof result.error === 'string'
            ? result.error
            : 'PDF upload failed';
        throw new Error(message);
      }
      setAttachmentUrl(result.url);
      markDirty();
    } catch (error) {
      toast.error(apiMessage(error, 'PDF upload failed'));
    } finally {
      setUploadingPdf(false);
    }
  };

  const removeArticle = async () => {
    if (!id) {
      router.push('/admin/content');
      return;
    }
    if (!window.confirm('Delete this article?')) return;
    try {
      await contentRequest(`/api/admin/content/articles/${id}`, { method: 'DELETE' });
      dirtyRef.current = false;
      toast.success('Article deleted');
      router.push('/admin/content');
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the article'));
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading article...</p>;
  if (missing) return <p className="text-sm text-gray-500">Article not found.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">{id ? 'Edit article' : 'New article'}</h1>
          <p className="text-sm text-gray-500">
            {dirty ? 'Unsaved changes' : savedAt ? `Saved at ${savedAtLabel(savedAt)}` : 'Not saved yet'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setPreview(true)}>Preview</Button>
          {editable && (
            <>
              <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" isLoading={saving} onClick={() => void save({ status: 'draft', notice: 'Draft saved' })}>Save draft</Button>
              {status === 'published' ? (
                <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" isLoading={saving} onClick={() => void save({ status: 'draft', notice: 'Article unpublished' })}>Unpublish</Button>
              ) : (
                <Button type="button" size="sm" className="w-full sm:w-auto" isLoading={saving} onClick={() => void save({ status: 'published', notice: 'Article published' })}>Publish</Button>
              )}
              <Button type="button" variant="danger" size="sm" className="w-full sm:w-auto" onClick={() => void removeArticle()}>Delete</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <label className="block text-sm font-medium text-[#1A1A1A]">
            Type
            <select
              className={`${fieldClass()} mt-1`}
              value={type}
              disabled={!editable}
              onChange={(event) => {
                setType(event.target.value as ArticleType);
                markDirty();
              }}
            >
              {ARTICLE_TYPES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[#1A1A1A]">Applies to operating systems</legend>
            <p className="text-xs text-[#3A3A3A]">Leave empty for every OS, including products with no OS set.</p>
            <div className="flex flex-wrap gap-3">
              {OPERATING_SYSTEMS.map((item) => (
                <label key={item.value} className="inline-flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={appliesOs.includes(item.value)}
                    onChange={() => {
                      setAppliesOs((current) => current.includes(item.value)
                        ? current.filter((value) => value !== item.value)
                        : [...current, item.value]);
                      markDirty();
                    }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[#1A1A1A]">Applies to condition</legend>
            <p className="text-xs text-[#3A3A3A]">Leave empty for new, refurbished, and used.</p>
            <div className="flex flex-wrap gap-3">
              {PRODUCT_CONDITIONS.map((item) => (
                <label key={item.value} className="inline-flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <input
                    type="checkbox"
                    disabled={!editable}
                    checked={appliesCondition.includes(item.value)}
                    onChange={() => {
                      setAppliesCondition((current) => current.includes(item.value)
                        ? current.filter((value) => value !== item.value)
                        : [...current, item.value]);
                      markDirty();
                    }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-medium text-[#1A1A1A]">
            Title
            <input
              className={`${fieldClass()} mt-1`}
              value={title}
              disabled={!editable}
              onChange={(event) => {
                const next = event.target.value;
                setTitle(next);
                if (!slugTouched.current) setSlug(slugify(next));
                markDirty();
              }}
            />
          </label>
          <label className="block text-sm font-medium text-[#1A1A1A]">
            Slug
            <input
              className={`${fieldClass()} mt-1`}
              value={slug}
              disabled={!editable}
              onChange={(event) => {
                slugTouched.current = true;
                setSlug(event.target.value);
                markDirty();
              }}
            />
          </label>
          <label className="block text-sm font-medium text-[#1A1A1A]">
            Summary
            <textarea
              className={`${fieldClass()} mt-1`}
              rows={3}
              value={summary}
              disabled={!editable}
              onChange={(event) => {
                setSummary(event.target.value);
                markDirty();
              }}
            />
          </label>
          <div>
            <p className="mb-1 text-sm font-medium text-[#1A1A1A]">Body</p>
            <RichTextEditor
              value={body}
              editable={editable}
              onChange={(html) => {
                const empty = (value: string) => !value || value === '<p></p>';
                setBody(html);
                if (!(empty(body) && empty(html))) markDirty();
              }}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#1A1A1A]">PDF attachment</p>
            <div className="flex flex-col gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                {attachmentUrl ? (
                  <a href={attachmentUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-[#1A1A1A] underline">
                    {fileNameFromUrl(attachmentUrl)}
                  </a>
                ) : (
                  <p className="text-sm text-[#3A3A3A]">No PDF attached</p>
                )}
                <p className="text-xs text-gray-500">Optional. PDF only, up to 10 MB.</p>
              </div>
              {editable && (
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" isLoading={uploadingPdf} onClick={() => pdfRef.current?.click()}>
                    {attachmentUrl ? 'Replace' : 'Upload PDF'}
                  </Button>
                  {attachmentUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setAttachmentUrl(''); markDirty(); }}>Remove</Button>
                  )}
                </div>
              )}
            </div>
            <input
              ref={pdfRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void uploadPdf(file);
              }}
            />
          </div>
          <label className="block text-sm font-medium text-[#1A1A1A]">
            Sort order
            <input
              type="number"
              className={`${fieldClass()} mt-1`}
              value={sortOrder}
              disabled={!editable}
              onChange={(event) => {
                setSortOrder(Number(event.target.value));
                markDirty();
              }}
            />
          </label>
        </div>

        <aside className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="font-semibold text-[#1A1A1A]">Targeting</h2>
          <label className="flex items-center gap-2 text-sm text-[#1A1A1A]">
            <input
              type="checkbox"
              checked={allLaptops}
              disabled={!editable}
              onChange={(event) => {
                setAllLaptops(event.target.checked);
                markDirty();
              }}
            />
            All laptops
          </label>
          {!allLaptops && (
            <div className="space-y-4">
              <MultiSelect label="Brands" options={brands} selected={brandIds} disabled={!editable} onChange={(ids) => { setBrandIds(ids); markDirty(); }} />
              <MultiSelect label="Categories" options={categories} selected={categoryIds} disabled={!editable} onChange={(ids) => { setCategoryIds(ids); markDirty(); }} />
              <MultiSelect label="Products" options={products} selected={productIds} disabled={!editable} remote emptyLabel="No products match" onSearch={queueProductSearch} onChange={(ids) => { setProductIds(ids); markDirty(); }} />
            </div>
          )}
        </aside>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setPreview(false)}>
          <div className="flex max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white sm:max-h-[85vh] sm:rounded-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
              <h2 className="min-w-0 truncate text-lg font-bold text-[#1A1A1A]">{title || 'Preview'}</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPreview(false)}>Close</Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {summary && <p className="mb-4 text-sm text-[#3A3A3A]">{summary}</p>}
            <div className="article-body text-[#1A1A1A]" dangerouslySetInnerHTML={{ __html: body || '<p></p>' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
