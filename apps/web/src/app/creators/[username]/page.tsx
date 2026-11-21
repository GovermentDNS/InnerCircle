'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import PostCard from '../../../components/PostCard';
import { ApiError, api, apiWithOptionalAuth } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatDate, formatNaira, initials } from '../../../lib/format';
import type { CreatorProfile, Post, PostPage } from '../../../lib/types';

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const primaryBtn =
  'rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60';
const secondaryBtn =
  'rounded-lg border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60';

export default function CreatorPage() {
  const params = useParams<{ username: string }>();
  const username = String(params.username ?? '');
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);

  const load = useCallback(async () => {
    const encoded = encodeURIComponent(username);
    try {
      const p = await apiWithOptionalAuth<CreatorProfile>(`/creators/${encoded}`);
      const first = await apiWithOptionalAuth<PostPage>(
        `/creators/${encoded}/posts?limit=20`,
      );
      setProfile(p);
      setPosts(first.items);
      setCursor(first.nextCursor);
      setNotFound(false);
      setError('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(messageOf(err));
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, user?.id, load]);

  async function loadMore() {
    if (!cursor) return;
    setMoreBusy(true);
    try {
      const next = await apiWithOptionalAuth<PostPage>(
        `/creators/${encodeURIComponent(username)}/posts?limit=20&cursor=${encodeURIComponent(cursor)}`,
      );
      setPosts((prev) => [...prev, ...next.items]);
      setCursor(next.nextCursor);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setMoreBusy(false);
    }
  }

  async function act(action: 'subscribe-dev' | 'unsubscribe') {
    setBusy(true);
    setError('');
    try {
      await api(`/creators/${encodeURIComponent(username)}/${action}`, {
        method: 'POST',
        auth: true,
      });
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-neutral-500">
        Loading...
      </p>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-bold">Creator not found</h1>
        <Link href="/creators" className="mt-3 inline-block text-sm underline">
          Back to discover
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-red-700">
        {error || 'Could not load this profile.'}
      </p>
    );
  }

  const v = profile.viewer;
  const subscribeLabel = profile.monthlyPriceKobo
    ? `Subscribe for ${formatNaira(profile.monthlyPriceKobo)} / month (test mode)`
    : 'Subscribe for free (test mode)';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-2xl font-semibold text-white">
          {initials(profile.displayName)}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {profile.displayName}
          </h1>
          <p className="text-sm text-neutral-500">@{profile.username}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {profile.postCount} posts · {profile.subscriberCount} subscribers
          </p>
        </div>
      </div>

      {profile.bio ? (
        <p className="mt-4 whitespace-pre-wrap text-sm text-neutral-700">
          {profile.bio}
        </p>
      ) : null}

      <div className="mt-6">
        {v.isOwner ? (
          <p className="text-sm text-neutral-600">This is your public profile.</p>
        ) : !user ? (
          <Link href="/login" className={`inline-block ${primaryBtn}`}>
            Log in to subscribe
          </Link>
        ) : v.isSubscribed ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
              {v.status === 'CANCELLED'
                ? 'Cancelled, access until '
                : 'Subscribed until '}
              {formatDate(v.currentPeriodEnd)}
            </span>
            {v.status === 'ACTIVE' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void act('unsubscribe');
                }}
                className={secondaryBtn}
              >
                Cancel subscription
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void act('subscribe-dev');
                }}
                className={secondaryBtn}
              >
                Resubscribe (test mode)
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void act('subscribe-dev');
            }}
            className={primaryBtn}
          >
            {busy ? 'Working...' : subscribeLabel}
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <h2 className="mt-10 text-lg font-semibold">Posts</h2>
      {posts.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-500">No posts yet.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
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
          className={`mt-4 ${secondaryBtn}`}
        >
          {moreBusy ? 'Loading...' : 'Load more'}
        </button>
      ) : null}
    </div>
  );
}
