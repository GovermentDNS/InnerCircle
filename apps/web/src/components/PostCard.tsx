import Link from 'next/link';
import type { Post } from '../lib/types';
import { formatDate } from '../lib/format';

export default function PostCard({
  post,
  showCreator = false,
}: {
  post: Post;
  showCreator?: boolean;
}) {
  const plural = post.mediaCount === 1 ? '' : 's';

  return (
    <article className="rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between text-xs text-neutral-500">
        {showCreator && post.creator ? (
          <Link
            href={`/creators/${post.creator.username}`}
            className="font-medium text-neutral-800 hover:underline"
          >
            {post.creator.displayName}
          </Link>
        ) : (
          <span>
            {post.visibility === 'FREE' ? 'Free post' : 'Subscribers only'}
          </span>
        )}
        <span>{formatDate(post.createdAt)}</span>
      </div>

      {post.locked ? (
        <div className="mt-3 rounded-lg bg-neutral-100 px-4 py-6 text-center text-sm text-neutral-600">
          This post is for subscribers.
          {post.mediaCount > 0
            ? ` It includes ${post.mediaCount} attachment${plural}.`
            : ''}
        </div>
      ) : (
        <>
          {post.caption ? (
            <p className="mt-3 whitespace-pre-wrap text-sm">{post.caption}</p>
          ) : null}
          {post.mediaCount > 0 ? (
            <p className="mt-3 text-xs text-neutral-500">
              {post.mediaCount} attachment{plural} uploaded. Image display is
              coming in the next part.
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
