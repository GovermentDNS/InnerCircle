'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '../../lib/auth';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return <p className="mx-auto max-w-3xl px-4 py-12 text-sm text-neutral-500">Loading...</p>;
  }

  const isCreator = user.role === 'CREATOR';

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      <div className="mt-6 rounded-xl border border-neutral-200 p-5">
        <p className="text-sm text-neutral-500">Signed in as</p>
        <p className="mt-1 font-medium">{user.email}</p>
        <span className="mt-3 inline-block rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">
          {user.role}
        </span>
      </div>

      <p className="mt-6 text-sm text-neutral-600">
        {isCreator
          ? 'Your creator tools are coming next: edit your profile, set a monthly price and publish posts with photos.'
          : 'Creator discovery and your subscriber feed are coming next.'}
      </p>
    </div>
  );
}
