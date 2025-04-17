'use client';

import Image from 'next/image';
import { ThumbsUp, MessageSquare } from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function PostItem({ post }) {
  return (
    <div className="p-4 bg-dark rounded-lg shadow border border-light/30">
      <div className="flex items-start gap-3 mb-3">
        <Image
          src={post.user?.image || '/default-avatar.svg'}
          alt={post.user?.name || 'User'}
          width={36}
          height={36}
          className="rounded-full flex-shrink-0 mt-1 bg-medium"
        />
        <div>
          <p className="font-semibold text-white">
            {post.user?.name || 'Unknown User'}
          </p>
          <p className="text-xs text-white/60">{formatDate(post.createdAt)}</p>
        </div>
        {post.isPinned && (
          <span className="ml-auto text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded">
            PINNED
          </span>
        )}
      </div>

      {post.title && (
        <h3 className="text-lg font-semibold text-white/90 mb-2">
          {post.title}
        </h3>
      )}
      <p className="text-white/80 whitespace-pre-wrap break-words mb-4">
        {post.content}
      </p>
    </div>
  );
}

export default function FloorPostsList({ posts = [], isLoading, error }) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-4 bg-dark rounded-lg shadow border border-light/30"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-medium"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-medium rounded w-1/3"></div>
                <div className="h-3 bg-medium rounded w-1/4"></div>
              </div>
            </div>
            <div className="h-4 bg-medium rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-medium rounded w-full mb-1"></div>
            <div className="h-4 bg-medium rounded w-5/6"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-400 text-center py-4">
        Error loading posts: {error}
      </p>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <p className="text-white/60 text-center py-4">
        No posts on this floor yet. Be the first!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  );
}
