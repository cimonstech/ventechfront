'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { RichTextEditor } from '@/components/admin/RichTextEditor';
import { useAccess } from '@/context/AccessContext';
import {
  apiMessage,
  contentRequest,
  type ContentStatus,
  type FaqCategoryRecord,
  type FaqRecord,
} from '@/lib/contentAdmin';
import { FAQ_AUDIENCES, type FaqAudience } from '@/lib/portalTargeting';
import { AccessDenied, EmptyState, ErrorState, TableSkeleton, UpdatingNotice } from '@/components/ui-states';
import { useListQuery } from '@/hooks/useListQuery';
import {
  AdminPageHeader,
  AdminRowCard,
  ConfirmDialog,
  RowActions,
} from '@/components/admin/list';
import { Badge } from '@/components/ui/Badge';

function byOrder<T extends { sort_order: number; question?: string; name?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || String(a.name || a.question).localeCompare(String(b.name || b.question)));
}

type DeleteTarget =
  | { kind: 'category'; category: FaqCategoryRecord }
  | { kind: 'faq'; faq: FaqRecord };

export default function AdminFaqsPage() {
  const { canEdit } = useAccess();
  const editable = canEdit('content');
  const query = useListQuery();
  const [categories, setCategories] = useState<FaqCategoryRecord[]>([]);
  const [faqs, setFaqs] = useState<FaqRecord[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [newCategory, setNewCategory] = useState('');
  const [newAudience, setNewAudience] = useState<FaqAudience>('store');
  const [categoryAudience, setCategoryAudience] = useState<FaqAudience>('store');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [editingFaq, setEditingFaq] = useState<string | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [faqStatus, setFaqStatus] = useState<ContentStatus>('published');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    await query.run(async () => {
      const [categoryRows, faqRows] = await Promise.all([
        contentRequest<FaqCategoryRecord[]>('/api/admin/content/faq-categories'),
        contentRequest<FaqRecord[]>('/api/admin/content/faqs'),
      ]);
      setCategories(byOrder(categoryRows || []));
      setFaqs(byOrder(faqRows || []));
    });
  };

  useEffect(() => {
    void load();
  }, []);

  const createCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Enter a category name');
      return;
    }
    try {
      await contentRequest('/api/admin/content/faq-categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategory.trim(), sort_order: categories.length, audience: newAudience }),
      });
      setNewCategory('');
      setNewAudience('store');
      toast.success('Category added');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not add the category'));
    }
  };

  const saveCategory = async (category: FaqCategoryRecord) => {
    try {
      await contentRequest(`/api/admin/content/faq-categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: categoryName.trim(),
          sort_order: category.sort_order,
          is_active: category.is_active,
          audience: categoryAudience,
        }),
      });
      setEditingCategory(null);
      toast.success('Category updated');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update the category'));
    }
  };

  const toggleCategory = async (category: FaqCategoryRecord) => {
    try {
      await contentRequest(`/api/admin/content/faq-categories/${category.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not update the category'));
    }
  };

  const deleteCategory = async (category: FaqCategoryRecord) => {
    try {
      await contentRequest(`/api/admin/content/faq-categories/${category.id}`, { method: 'DELETE' });
      toast.success('Category deleted');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the category'));
    }
  };

  const moveCategory = async (index: number, direction: -1 | 1) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    try {
      await contentRequest('/api/admin/content/faq-categories/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items: next.map((row, order) => ({ id: row.id, sort_order: order })) }),
      });
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the order'));
    }
  };

  const faqsFor = (categoryId: string) => byOrder(faqs.filter((faq) => faq.category_id === categoryId));

  const moveFaq = async (categoryId: string, index: number, direction: -1 | 1) => {
    const next = faqsFor(categoryId);
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    try {
      await contentRequest('/api/admin/content/faqs/reorder', {
        method: 'PUT',
        body: JSON.stringify({ items: next.map((row, order) => ({ id: row.id, sort_order: order })) }),
      });
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the order'));
    }
  };

  const startFaq = (faq?: FaqRecord, categoryId?: string) => {
    setAddingIn(faq ? null : categoryId || null);
    setEditingFaq(faq?.id || null);
    setQuestion(faq?.question || '');
    setAnswer(faq?.answer_html || '');
    setFaqStatus(faq?.status || 'published');
  };

  const saveFaq = async (categoryId: string, faqId?: string) => {
    if (!question.trim()) {
      toast.error('Enter a question');
      return;
    }
    const plain = answer.replace(/<[^>]+>/g, '').trim();
    if (!plain) {
      toast.error('Enter an answer');
      return;
    }
    try {
      if (faqId) {
        await contentRequest(`/api/admin/content/faqs/${faqId}`, {
          method: 'PUT',
          body: JSON.stringify({ question: question.trim(), answer_html: answer, status: faqStatus }),
        });
        toast.success('FAQ updated');
      } else {
        await contentRequest('/api/admin/content/faqs', {
          method: 'POST',
          body: JSON.stringify({
            category_id: categoryId,
            question: question.trim(),
            answer_html: answer,
            status: faqStatus,
            sort_order: faqsFor(categoryId).length,
          }),
        });
        toast.success('FAQ added');
      }
      startFaq();
      setAddingIn(null);
      setEditingFaq(null);
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not save the FAQ'));
    }
  };

  const deleteFaq = async (faq: FaqRecord) => {
    try {
      await contentRequest(`/api/admin/content/faqs/${faq.id}`, { method: 'DELETE' });
      toast.success('FAQ deleted');
      await load();
    } catch (error) {
      toast.error(apiMessage(error, 'Could not delete the FAQ'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'category') {
        await deleteCategory(deleteTarget.category);
      } else {
        await deleteFaq(deleteTarget.faq);
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const faqForm = (categoryId: string, faqId?: string) => (
    <div className="space-y-3 rounded-lg border border-gray-200 p-3">
      <input
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder="Question"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
      <RichTextEditor compact value={answer} onChange={setAnswer} placeholder="Answer" />
      <select value={faqStatus} onChange={(event) => setFaqStatus(event.target.value as ContentStatus)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => void saveFaq(categoryId, faqId)}>Save</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setAddingIn(null); setEditingFaq(null); }}>Cancel</Button>
      </div>
    </div>
  );

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
        title="We couldn't load FAQs"
        description="Try again in a moment."
        primary={{ label: 'Try again', onClick: () => void load() }}
      />
    );
  }

  if (query.loading && !query.loaded) {
    return <TableSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-4">
      {query.updating ? <UpdatingNotice /> : null}
      <style>{`
        .article-body h2 { font-size: 1.5rem; font-weight: 700; margin: 1rem 0 0.5rem; }
        .article-body h3 { font-size: 1.15rem; font-weight: 600; margin: 0.75rem 0 0.4rem; }
        .article-body p { margin: 0.5rem 0; line-height: 1.6; }
        .article-body ul { list-style: disc; margin: 0.5rem 0 0.5rem 1.25rem; }
        .article-body ol { list-style: decimal; margin: 0.5rem 0 0.5rem 1.25rem; }
        .article-body a { color: #FF7A19; text-decoration: underline; }
      `}</style>
      <AdminPageHeader
        title="FAQs"
        subtitle={`${faqs.length} FAQ${faqs.length === 1 ? '' : 's'}`}
      />
      {editable && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="New category name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm sm:max-w-sm"
          />
          <select
            value={newAudience}
            onChange={(event) => setNewAudience(event.target.value as FaqAudience)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {FAQ_AUDIENCES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={() => void createCategory()}>Add category</Button>
        </div>
      )}
      {categories.length === 0 ? (
        <EmptyState
          title="No FAQ categories yet"
          description="Add a category, then write the first question."
        />
      ) : null}
      {categories.map((category, index) => {
        const items = faqsFor(category.id);
        const expanded = open[category.id] !== false;
        return (
          <section key={category.id} className="rounded-xl border border-gray-200 bg-white">
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="text-left" onClick={() => setOpen((current) => ({ ...current, [category.id]: !expanded }))}>
                <span className="font-semibold text-[#1A1A1A]">{category.name}</span>
                <span className="ml-2 text-xs text-gray-500">{category.is_active ? 'Active' : 'Inactive'} · {FAQ_AUDIENCES.find((item) => item.value === (category.audience || 'store'))?.label} · {items.length}</span>
              </button>
              {editable && (
                <RowActions
                  name={category.name}
                  actions={[
                    { label: 'Up', onClick: () => void moveCategory(index, -1), hidden: index === 0 },
                    { label: 'Down', onClick: () => void moveCategory(index, 1), hidden: index === categories.length - 1 },
                    { label: 'Edit', onClick: () => { setEditingCategory(category.id); setCategoryName(category.name); setCategoryAudience(category.audience || 'store'); } },
                    { label: category.is_active ? 'Deactivate' : 'Activate', onClick: () => void toggleCategory(category) },
                    { label: 'Delete', destructive: true, onClick: () => setDeleteTarget({ kind: 'category', category }) },
                  ]}
                />
              )}
            </div>
            {expanded && (
              <div className="space-y-3 border-t border-gray-100 p-4">
                {editingCategory === category.id && editable && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                    <select
                      value={categoryAudience}
                      onChange={(event) => setCategoryAudience(event.target.value as FaqAudience)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      {FAQ_AUDIENCES.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    <Button type="button" size="sm" onClick={() => void saveCategory(category)}>Save</Button>
                  </div>
                )}
                {items.map((faq, faqIndex) => (
                  editingFaq === faq.id ? (
                    <div key={faq.id}>{faqForm(category.id, faq.id)}</div>
                  ) : (
                    <div key={faq.id} className="space-y-2">
                      <AdminRowCard
                        name={faq.question}
                        status={
                          <Badge variant={faq.status === 'published' ? 'success' : 'default'} size="sm">
                            {faq.status}
                          </Badge>
                        }
                        actions={
                          editable ? (
                            <RowActions
                              name={faq.question}
                              actions={[
                                { label: 'Up', onClick: () => void moveFaq(category.id, faqIndex, -1), hidden: faqIndex === 0 },
                                { label: 'Down', onClick: () => void moveFaq(category.id, faqIndex, 1), hidden: faqIndex === items.length - 1 },
                                { label: 'Edit', onClick: () => startFaq(faq) },
                                { label: 'Delete', destructive: true, onClick: () => setDeleteTarget({ kind: 'faq', faq }) },
                              ]}
                            />
                          ) : undefined
                        }
                      />
                      <div className="article-body px-1 text-sm text-[#3A3A3A]" dangerouslySetInnerHTML={{ __html: faq.answer_html || '' }} />
                    </div>
                  )
                ))}
                {editable && addingIn === category.id && faqForm(category.id)}
                {editable && addingIn !== category.id && (
                  <Button type="button" variant="outline" size="sm" onClick={() => startFaq(undefined, category.id)}>Add FAQ</Button>
                )}
              </div>
            )}
          </section>
        );
      })}

      {deleteTarget ? (
        <ConfirmDialog
          title={deleteTarget.kind === 'category' ? `Delete ${deleteTarget.category.name}?` : 'Delete this FAQ?'}
          confirmLabel="Delete"
          busy={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        >
          {deleteTarget.kind === 'category'
            ? `${deleteTarget.category.name} will be removed.`
            : `${deleteTarget.faq.question} will be removed.`}
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
