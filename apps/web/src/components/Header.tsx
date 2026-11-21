'use client';

import Link from 'next/link';
import { useAuth } from '../lib/auth';

export default function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="border-b border-neutral-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          InnerCircle
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/creators"
            className="text-neutral-700 hover:text-neutral-900"
          >
            Discover
          </Link>
          {loading ? null : user ? (
            <>
              <Link
                href="/feed"
                className="text-neutral-700 hover:text-neutral-900"
              >
                Feed
              </Link>
              <Link
                href="/dashboard"
                className="text-neutral-700 hover:text-neutral-900"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => {
                  void logout();
                }}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-neutral-700 hover:text-neutral-900"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-neutral-900 px-3 py-1.5 font-medium text-white hover:bg-neutral-800"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
