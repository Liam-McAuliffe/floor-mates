'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import {
  ThumbsUp,
  MessageSquare,
  Pencil,
  Trash2,
  Save,
  XCircle,
} from 'lucide-react';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString([], {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function PostItem({ post, onDeletePost, onUpdatePost, onUpvoteChanged }) {
  const currentUserProfile = useSelector(selectUserProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(post.title || '');
  const [editedContent, setEditedContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [currentUpvoteCount, setCurrentUpvoteCount] = useState(
    post.upvoteCount
  );
  useEffect(() => {
    setCurrentUpvoteCount(post.upvoteCount);
  }, [post.upvoteCount]);

  const [hasUpvoted, setHasUpvoted] = useState(post.currentUserHasUpvoted);
  useEffect(() => {
    setHasUpvoted(post.currentUserHasUpvoted);
  }, [post.currentUserHasUpvoted]);

  const [isVoting, setIsVoting] = useState(false);
  const [voteError, setVoteError] = useState(null);

  const isAuthor = post.userId === currentUserProfile?.id;
  const isAdmin = currentUserProfile?.role === 'admin';
  const isRAOnFloor =
    currentUserProfile?.role === 'RA' &&
    currentUserProfile?.floorId === post.floorId;
  const canModify = isAuthor || isAdmin || isRAOnFloor;

  const handleEditClick = () => {
    setEditedTitle(post.title || '');
    setEditedContent(post.content);
    setUpdateError(null);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setUpdateError(null);
  };

  const handleUpdate = async () => {
    if (!editedContent.trim()) {
      setUpdateError('Content cannot be empty.');
      return;
    }
    try {
      setIsUpdating(true);
      setUpdateError(null);
      await onUpdatePost(post.id, {
        title: editedTitle.trim() || null,
        content: editedContent.trim(),
      });
      setIsEditing(false);
    } catch (err) {
      setUpdateError(err.message || 'Failed to update post.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMsg = `Failed to delete post (${response.status})`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      onDeletePost(post.id);
    } catch (err) {
      setDeleteError(err.message || 'Could not delete post.');
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpvoteToggle = useCallback(async () => {
    if (isVoting || !currentUserProfile?.id) return;
    setIsVoting(true);
    setVoteError(null);

    const originalHasUpvoted = hasUpvoted;
    const originalUpvoteCount = currentUpvoteCount;

    setHasUpvoted(!originalHasUpvoted);
    setCurrentUpvoteCount(
      originalHasUpvoted ? originalUpvoteCount - 1 : originalUpvoteCount + 1
    );

    try {
      const method = originalHasUpvoted ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${post.id}/upvote`, {
        method: method,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            `Failed to ${method === 'POST' ? 'upvote' : 'remove upvote'}`
        );
      }

      setCurrentUpvoteCount(data.upvoteCount);
      setHasUpvoted(data.currentUserHasUpvoted);

      if (onUpvoteChanged) {
        onUpvoteChanged(post.id, data.upvoteCount, data.currentUserHasUpvoted);
      }
    } catch (err) {
      setVoteError(err.message);
      setHasUpvoted(originalHasUpvoted);
      setCurrentUpvoteCount(originalUpvoteCount);
      setTimeout(() => setVoteError(null), 4000);
    } finally {
      setIsVoting(false);
    }
  }, [
    isVoting,
    hasUpvoted,
    currentUpvoteCount,
    post.id,
    onUpvoteChanged,
    currentUserProfile?.id,
  ]);

  return (
    <div className="p-4 bg-dark rounded-lg shadow border border-light/30 relative space-y-3">
      <div className="flex items-start gap-3 mb-1">
        <Image
          src={post.user?.image || '/default-avatar.svg'}
          alt={post.user?.name || 'User'}
          width={36}
          height={36}
          className="rounded-full flex-shrink-0 mt-1 bg-medium"
          onError={(e) => {
            e.currentTarget.src = '/default-avatar.svg';
          }}
        />
        <div>
          <p className="font-semibold text-white">
            {post.user?.name || 'Unknown User'}
          </p>
          <p className="text-xs text-white/60">{formatDate(post.createdAt)}</p>
        </div>
        {post.isPinned && (
          <span
            className={`absolute top-3 right-3 text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded ${
              canModify && !isEditing ? 'mr-16 sm:mr-20' : ''
            }`}
          >
            PINNED
          </span>
        )}
        {canModify && !isEditing && (
          <div className="absolute top-3 right-3 flex gap-2">
            {isAuthor && (
              <button
                onClick={handleEditClick}
                disabled={isDeleting}
                className="p-1 text-white/60 hover:text-brand disabled:opacity-50"
                title="Edit Post"
              >
                <Pencil size={16} />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1 text-white/60 hover:text-red-500 disabled:opacity-50"
              title="Delete Post"
            >
              {isDeleting ? (
                <span className="text-xs animate-pulse">...</span>
              ) : (
                <Trash2 size={16} />
              )}
            </button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            placeholder="Post Title (Optional)"
            className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-lg font-semibold"
            disabled={isUpdating}
          />
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            placeholder="Post Content"
            rows={4}
            required
            className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-y min-h-[80px]"
            disabled={isUpdating}
          />
          {updateError && <p className="text-xs text-red-400">{updateError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancelClick}
              disabled={isUpdating}
              className="flex items-center px-3 py-1 rounded-md text-sm text-white bg-gray-500 hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <XCircle size={16} className="inline mr-1" /> Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating || !editedContent.trim()}
              className="flex items-center px-3 py-1 rounded-md text-sm text-white bg-brand hover:bg-opacity-85 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              <Save size={16} className="inline mr-1" />{' '}
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {post.title && (
            <h3 className="text-lg font-semibold text-white/90 mb-2 mt-1">
              {post.title}
            </h3>
          )}
          <p className="text-white/80 whitespace-pre-wrap break-words mb-3">
            {post.content}
          </p>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <button
              onClick={handleUpvoteToggle}
              disabled={isVoting || !currentUserProfile?.id}
              className={`flex items-center gap-1 p-1 rounded hover:bg-light disabled:opacity-50 ${
                hasUpvoted ? 'text-brand' : 'text-white/60 hover:text-brand'
              }`}
              title={
                !currentUserProfile?.id
                  ? 'Log in to upvote'
                  : hasUpvoted
                  ? 'Remove upvote'
                  : 'Upvote'
              }
            >
              <ThumbsUp size={16} fill={hasUpvoted ? 'currentColor' : 'none'} />
              <span>{currentUpvoteCount}</span>
            </button>
          </div>
          {voteError && (
            <p className="text-xs text-red-400 mt-1">{voteError}</p>
          )}
          {deleteError && (
            <p className="text-xs text-red-400 text-right mt-1">
              {deleteError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function FloorPostsList({
  posts: initialPosts = [],
  isLoading,
  error,
  onUpdatePost,
  onDeletePost,
  onPostsNeedRefresh,
}) {
  const [posts, setPosts] = useState(initialPosts);

  useEffect(() => {
    setPosts(initialPosts);
  }, [initialPosts]);

  const handleUpvoteChanged = useCallback(
    (postId, newCount, newHasUpvoted) => {
      setPosts((currentPosts) =>
        currentPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                upvoteCount: newCount,
                currentUserHasUpvoted: newHasUpvoted,
              }
            : p
        )
      );

      if (onPostsNeedRefresh) {
        onPostsNeedRefresh();
      }
    },
    [onPostsNeedRefresh]
  );

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
        <PostItem
          key={post.id}
          post={post}
          onDeletePost={onDeletePost}
          onUpdatePost={onUpdatePost}
          onUpvoteChanged={handleUpvoteChanged}
        />
      ))}
    </div>
  );
}
