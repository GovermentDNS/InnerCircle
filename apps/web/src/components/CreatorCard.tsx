import Link from 'next/link';
import type { CreatorSummary } from '../lib/types';
import { formatNaira, initials } from '../lib/format';

export default function CreatorCard({ creator }: { creator: CreatorSummary }) {
  return (
    <Link
      href={`/creators/${creator.username}`}
      className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 hover:bg-neutral-50"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-semibold text-white">
        {initials(creator.displayName)}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold">{creator.displayName}</p>
        <p className="truncate text-sm text-neutral-500">@{creator.username}</p>
        {creator.bio ? (
          <p className="mt-1 line-clamp-2 text-sm text-neutral-700">
            {creator.bio}
          </p>
        ) : null}
        <p className="mt-2 text-xs font-medium text-neutral-600">
          {creator.monthlyPriceKobo
            ? `${formatNaira(creator.monthlyPriceKobo)} / month`
            : 'Free to follow'}
        </p>
      </div>
    </Link>
  );
}
