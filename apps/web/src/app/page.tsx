import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Support the creators you love.
        </h1>
        <p className="mt-4 text-lg text-neutral-600">
          InnerCircle lets creators share exclusive posts with the fans who
          subscribe to them. Built in Nigeria, for creators everywhere.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50"
          >
            Log in
          </Link>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-semibold">Follow</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Discover creators in music, fitness, cooking, education and more.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-semibold">Subscribe</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Unlock subscriber-only posts with a simple monthly plan.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 p-5">
          <h2 className="font-semibold">Create</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Share photos, videos and updates, and earn from your audience.
          </p>
        </div>
      </div>
    </div>
  );
}
