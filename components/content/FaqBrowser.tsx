'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ContentHtml } from '@/components/content/ContentHtml';
import type { PublicFaqCategory } from '@/lib/publicContent';

function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function FaqBrowser({ categories }: { categories: PublicFaqCategory[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const tabs = ['All', ...categories.map((category) => category.name)];
  const needle = search.trim().toLowerCase();

  const items = useMemo(() => {
    return categories.flatMap((category) =>
      category.faqs
        .filter((faq) => {
          if (activeCategory !== 'All' && category.name !== activeCategory) return false;
          if (!needle) return true;
          return faq.question.toLowerCase().includes(needle) || plainText(faq.answer_html).includes(needle);
        })
        .map((faq) => ({ ...faq, category: category.name }))
    );
  }, [activeCategory, categories, needle]);

  return (
    <>
      <div className="mb-6">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search questions"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-[#1A1A1A] focus:border-[#FF7A19] focus:outline-none"
        />
      </div>

      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {tabs.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === category
                ? 'bg-[#FF7A19] text-white'
                : 'bg-white text-[#3A3A3A] hover:bg-gray-100'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mb-12 overflow-hidden rounded-xl bg-white shadow-lg">
        {items.length === 0 && (
          <p className="px-6 py-8 text-center text-[#3A3A3A]">No questions match that search.</p>
        )}
        {items.map((faq) => (
          <div key={faq.id} className="border-b border-gray-200 last:border-b-0">
            <button
              type="button"
              onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
              className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-gray-50"
            >
              <div className="flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#FF7A19]">
                  {faq.category}
                </span>
                <h3 className="mt-1 text-lg font-semibold text-[#1A1A1A]">{faq.question}</h3>
              </div>
              <ChevronDown
                className={`ml-4 h-5 w-5 flex-shrink-0 text-[#3A3A3A] transition-transform ${
                  openId === faq.id ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openId === faq.id && (
              <div className="px-6 pb-5">
                <ContentHtml html={faq.answer_html} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
