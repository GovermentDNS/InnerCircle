'use client';

import { useEffect, useState } from 'react';
import CreatorCard from '../../components/CreatorCard';
import { api } from '../../lib/api';
import type { CreatorSummary } from '../../lib/types';

export default function CreatorsPage() {
  const [q, setQ] = useState('');
  const [items, setItems] = useState<CreatorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const term = q.trim();
          const qs = term ? `?q=${encodeURIComponent(term)}` : '';
          const data = await api<CreatorSummary[]>(`/creators${qs}`);
          if (!cancelled) {
            setItems(data);
            setError('');
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Discover creators</h1>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name or username"
        className="mt-4 w-full max-w-md rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-neutral-500">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">No creators found.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((c) => (
            <CreatorCard key={c.username} creator={c} />
          ))}
        </div>
      )}
    </div>
  );
}
