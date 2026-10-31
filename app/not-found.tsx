'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/ui-states';

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/shop');
  };

  return (
    <div className="min-h-[50vh] px-4 py-8">
      <EmptyState
        title="We can't find that page"
        description="It may have moved, or the link is out of date. Search the shop, or go back home."
        primary={{ label: 'Go to Shop', href: '/shop' }}
        secondary={{ label: 'Go to home', href: '/' }}
      />
      <form onSubmit={onSearch} className="mx-auto mt-2 flex w-full max-w-md gap-2">
        <label htmlFor="not-found-search" className="sr-only">
          Search the shop
        </label>
        <input
          id="not-found-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search products"
          className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-[#1A1A1A] focus:border-[#FF7A19] focus:outline-none focus:ring-2 focus:ring-[#FF7A19]"
        />
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-[#FF7A19] px-4 text-sm font-semibold text-white hover:bg-[#E66600]"
        >
          Search
        </button>
      </form>
    </div>
  );
}
