'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PostCard from '../../components/PostCard';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Post, PostPage } from '../../lib/types';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const page = await api<PostPage>('/feed?limit=20', { auth: true });
        if (!cancelled) {
          setPosts(page.items);
          setCursor(page.nextCursor);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, router]);

  async function loadMore() {
    if (!cursor) return;
    setMoreBusy(true);
    try {
      const page = await api<PostPage>(
        `/feed?limit=20&cursor=${encodeURIComponent(cursor)}`,
        { auth: true },
      );
      setPosts((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setMoreBusy(false);
    }
  }

  if (authLoading || !user || loading) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-neutral-500">
        Loading...
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Your feed</h1>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {posts.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">
          Nothing here yet. Subscribe to a creator to see their posts.{' '}
          <Link href="/creators" className="font-medium text-neutral-900 underline">
            Discover creators
          </Link>
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} showCreator />
          ))}
        </div>
      )}

      {cursor ? (
        <button
          type="button"
          disabled={moreBusy}
          onClick={() => {
            void loadMore();
          }}
          className="mt-4 rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
        >
          {moreBusy ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </div>
  );
}
