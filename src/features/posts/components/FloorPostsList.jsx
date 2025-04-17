'use client';

import React, { useState, useEffect } from 'react';
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

function PostItem({ post, currentUserId, onDeletePost, onUpdatePost }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(post.title || '');
  const [editedContent, setEditedContent] = useState(post.content);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const isAuthor = post.userId === currentUserId;

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
    setUpdateError(null);
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editedTitle.trim() || null,
          content: editedContent.trim(),
        }),
      });
      const updatedPostData = await response.json();

      if (!response.ok) {
        throw new Error(
          updatedPostData.error || `Failed to update post (${response.status})`
        );
      }

      onUpdatePost(updatedPostData);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating post:', err);
      setUpdateError(err.message || 'Could not update post.');
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete post (${response.status})`
        );
      }

      onDeletePost(post.id);
    } catch (err) {
      console.error('Error deleting post:', err);
      setDeleteError(err.message || 'Could not delete post.');
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 bg-dark rounded-lg shadow border border-light/30 relative">
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
        {isAuthor && !isEditing && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={handleEditClick}
              disabled={isDeleting}
              className="p-1 text-white/60 hover:text-brand disabled:opacity-50"
              title="Edit Post"
            >
              <Pencil size={16} />
            </button>
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
        {post.isPinned && (
          <span
            className={`text-xs font-bold text-yellow-400 bg-yellow-900/50 px-2 py-0.5 rounded ${
              isAuthor && !isEditing ? 'mr-20' : 'ml-auto'
            }`}
          >
            PINNED
          </span>
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
              className="flex items-center px-3 py-1 rounded-md text-sm text-white bg-red-400 hover:bg-opacity-80 transition-colors disabled:opacity-50"
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
            <h3 className="text-lg font-semibold text-white/90 mb-2 mt-2">
              {post.title}
            </h3>
          )}
          <p className="text-white/80 whitespace-pre-wrap break-words mb-4">
            {post.content}
          </p>
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
  posts = [],
  isLoading,
  error,
  onUpdatePost,
  onDeletePost,
}) {
  const userProfile = useSelector(selectUserProfile);
  const currentUserId = userProfile?.id;

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
          currentUserId={currentUserId}
          onDeletePost={onDeletePost}
          onUpdatePost={onUpdatePost}
        />
      ))}
    </div>
  );
}
