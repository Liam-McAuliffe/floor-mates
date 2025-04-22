'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import {
  ThumbsUp,
  MessageSquare,
  Trash2,
  Pencil,
  Save,
  XCircle,
  Loader2,
  MapPin,
  Clock,
  Calendar,
  Repeat,
} from 'lucide-react';

function formatDate(
  dateString,
  options = { dateStyle: 'short', timeStyle: 'short' }
) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string received:', dateString);
      return 'Invalid Date';
    }

    if (options.dateStyle === 'full' && dateString) {
      const dateOnlyOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };

      const dateObj = dateString.includes('T')
        ? new Date(dateString)
        : new Date(dateString + 'T00:00:00Z');
      return dateObj.toLocaleDateString(undefined, dateOnlyOptions);
    }
    return date.toLocaleString([], options);
  } catch (e) {
    console.error('Error formatting date:', dateString, e);
    return 'Invalid Date';
  }
}

function BulletinCommentItem({
  comment,
  currentUserId,
  currentUserRole,
  postSchoolId,
  onDeleteComment,
  post, // Needed for correct API path
}) {
  const isCommentAuthor = comment.userId === currentUserId;
  const isAdmin = currentUserRole === 'admin';

  const userProfile = useSelector(selectUserProfile);

  const isRAOnCorrectSchool =
    currentUserRole === 'RA' && userProfile?.schoolId === postSchoolId;

  const canDeleteComment = isCommentAuthor || isAdmin || isRAOnCorrectSchool;
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  const handleDeleteClick = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?'))
      return;
    setIsDeletingComment(true);
    try {
      console.log('Attempting to delete bulletin comment with ID:', comment.id);
      const response = await fetch(
        `/api/bulletin/${post.id}/comments/${comment.id}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete comment (${response.status})`
        );
      }
      onDeleteComment(comment.id);
    } catch (error) {
      console.error('Error deleting bulletin comment:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsDeletingComment(false);
    }
  };

  return (
    <div className="flex items-start gap-2 pt-3 border-t border-light/20 first:border-t-0 first:pt-0">
      <Image
        src={comment.user?.image || '/default-avatar.svg'}
        alt={comment.user?.name || 'User'}
        width={28}
        height={28}
        className="rounded-full mt-1 flex-shrink-0 bg-medium"
        onError={(e) => {
          e.currentTarget.src = '/default-avatar.svg';
        }}
      />
      <div className="flex-grow">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-white/90">
            {comment.user?.name || 'Unknown User'}
          </span>
          {canDeleteComment && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeletingComment}
              className="p-1 text-xs text-white/50 hover:text-red-400 disabled:opacity-50"
              title="Delete comment"
            >
              {isDeletingComment ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Trash2 size={12} />
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-white/80 whitespace-pre-wrap break-words mt-1 mb-1">
          {comment.content}
        </p>
        <p className="text-xs text-white/50">{formatDate(comment.createdAt)}</p>
      </div>
    </div>
  );
}

export default function BulletinPostItem({
  post: initialPost,
  onDeletePost,
  onUpdatePost,
}) {
  const currentUserProfile = useSelector(selectUserProfile);
  const currentUserId = currentUserProfile?.id;
  const currentUserRole = currentUserProfile?.role;
  const currentUserSchoolId = currentUserProfile?.schoolId;

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(initialPost.title);
  const [editedContent, setEditedContent] = useState(initialPost.content);
  const [editedEventType, setEditedEventType] = useState(initialPost.eventType);

  const initialEventDate = initialPost.eventDate
    ? new Date(initialPost.eventDate).toISOString().split('T')[0]
    : '';
  const [editedEventDate, setEditedEventDate] = useState(initialEventDate);
  const [editedEventTime, setEditedEventTime] = useState(
    initialPost.eventTime || ''
  );
  const [editedLocation, setEditedLocation] = useState(
    initialPost.location || ''
  );
  const [editedRecurringDays, setEditedRecurringDays] = useState(
    initialPost.recurringDays || []
  );

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState(null);

  const [post, setPost] = useState(initialPost);

  useEffect(() => {
    setPost(initialPost);
    if (!isEditing) {
      setEditedTitle(initialPost.title);
      setEditedContent(initialPost.content);
      setEditedEventType(initialPost.eventType);
      const updatedEventDate = initialPost.eventDate
        ? new Date(initialPost.eventDate).toISOString().split('T')[0]
        : '';
      setEditedEventDate(updatedEventDate);
      setEditedEventTime(initialPost.eventTime || '');
      setEditedLocation(initialPost.location || '');
      setEditedRecurringDays(initialPost.recurringDays || []);
    }
  }, [initialPost, isEditing]);

  const [isLiking, setIsLiking] = useState(false);
  const [likeError, setLikeError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsError, setCommentsError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [submitCommentError, setSubmitCommentError] = useState(null);

  const isAdmin = currentUserRole === 'admin';
  const isAuthor = post.userId === currentUserId;
  const isRAOnCorrectSchool =
    currentUserRole === 'RA' && currentUserSchoolId === post.schoolId;

  const canEditThisPost = isAuthor || isAdmin || isRAOnCorrectSchool;

  const canDeleteThisPost = isAdmin || isRAOnCorrectSchool;

  const handleLikeToggle = useCallback(async () => {
    if (isLiking || !currentUserId) return;

    setIsLiking(true);
    setLikeError(null);
    const originalLiked = post.currentUserHasLiked;
    const originalCount = post.likeCount;

    setPost((currentPost) => ({
      ...currentPost,
      currentUserHasLiked: !originalLiked,
      likeCount: originalLiked ? originalCount - 1 : originalCount + 1,
    }));

    try {
      const method = originalLiked ? 'DELETE' : 'POST';
      const response = await fetch(`/api/bulletin/${post.id}/like`, { method });
      const data = await response.json();

      if (!response.ok && response.status !== 409) {
        throw new Error(
          data.error ||
            `Failed to ${method === 'POST' ? 'like' : 'unlike'} (${
              response.status
            })`
        );
      }

      setPost((currentPost) => ({
        ...currentPost,
        likeCount: data.likeCount,
        currentUserHasLiked: data.currentUserHasLiked,
      }));

      if (onUpdatePost) {
        onUpdatePost(post.id, {
          likeCount: data.likeCount,
          currentUserHasLiked: data.currentUserHasLiked,
        });
      }
    } catch (err) {
      console.error('Like toggle error:', err);
      setLikeError(err.message);
      setPost((currentPost) => ({
        ...currentPost,
        currentUserHasLiked: originalLiked,
        likeCount: originalCount,
      }));
      setTimeout(() => setLikeError(null), 4000);
    } finally {
      setIsLiking(false);
    }
  }, [
    isLiking,
    post.id,
    post.currentUserHasLiked,
    post.likeCount,
    currentUserId,
    onUpdatePost,
  ]);

  const handleDeletePostClick = async () => {
    if (!canDeleteThisPost || isDeleting) return;
    if (!window.confirm('Are you sure you want to delete this bulletin post?'))
      return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/bulletin/${post.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Failed to delete post (${response.status})`
        );
      }
      console.log(`Bulletin post ${post.id} deleted.`);
      if (onDeletePost) {
        onDeletePost(post.id);
      }
    } catch (err) {
      console.error('Delete post error:', err);
      setDeleteError(err.message);
      setIsDeleting(false);
      setTimeout(() => setDeleteError(null), 5000);
    }
  };

  const fetchComments = useCallback(async () => {
    if (isLoadingComments) return;
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const response = await fetch(`/api/bulletin/${post.id}/comments`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch comments');
      }
      setComments(data);
    } catch (err) {
      console.error('Fetch bulletin comments error:', err);
      setCommentsError(err.message);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id, isLoadingComments]);

  const handleToggleComments = () => {
    const newShowState = !showComments;
    setShowComments(newShowState);
    if (newShowState && (comments.length === 0 || commentsError)) {
      fetchComments();
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmittingComment || !currentUserId) return;

    setIsSubmittingComment(true);
    setSubmitCommentError(null);
    try {
      const response = await fetch(`/api/bulletin/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const createdComment = await response.json();
      if (!response.ok) {
        throw new Error(createdComment.error || 'Failed to post comment');
      }
      setComments((prev) => [...prev, createdComment]);
      setNewComment('');

      setPost((currentPost) => ({
        ...currentPost,
        commentCount: (currentPost.commentCount || 0) + 1,
      }));
      if (onUpdatePost) {
        onUpdatePost(post.id, { commentCount: (post.commentCount || 0) + 1 });
      }
    } catch (err) {
      console.error('Submit bulletin comment error:', err);
      setSubmitCommentError(err.message);
      setTimeout(() => setSubmitCommentError(null), 5000);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setPost((currentPost) => ({
      ...currentPost,
      commentCount: Math.max(0, (currentPost.commentCount || 1) - 1),
    }));
    if (onUpdatePost) {
      onUpdatePost(post.id, {
        commentCount: Math.max(0, (post.commentCount || 1) - 1),
      });
    }
  };

  const handleEditClick = () => {
    setEditedTitle(post.title);
    setEditedContent(post.content);
    setEditedEventType(post.eventType);
    const currentEventDate = post.eventDate
      ? new Date(post.eventDate).toISOString().split('T')[0]
      : '';
    setEditedEventDate(currentEventDate);
    setEditedEventTime(post.eventTime || '');
    setEditedLocation(post.location || '');
    setEditedRecurringDays(post.recurringDays || []);
    setUpdateError(null);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setUpdateError(null);
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editedContent.trim() || !editedTitle.trim()) {
      setUpdateError('Title and Content cannot be empty.');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    const dataToUpdate = {
      title: editedTitle,
      content: editedContent,
      eventType: editedEventType,
      location: editedLocation || null,
      eventTime: editedEventTime || null,

      eventDate:
        editedEventType === 'EVENT' && editedEventDate ? editedEventDate : null,
      recurringDays: editedEventType === 'RECURRING' ? editedRecurringDays : [],
    };

    try {
      const response = await fetch(`/api/bulletin/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToUpdate),
      });

      const updatedPostData = await response.json();

      if (!response.ok) {
        throw new Error(
          updatedPostData.error || `Failed to update post (${response.status})`
        );
      }

      if (onUpdatePost) {
        onUpdatePost(post.id, updatedPostData);
      }

      setIsEditing(false);
    } catch (err) {
      console.error('Update post error:', err);
      setUpdateError(err.message || 'Could not update post.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRecurringDayChange = (event) => {
    const { value, checked } = event.target;
    setEditedRecurringDays((prev) =>
      checked ? [...prev, value] : prev.filter((day) => day !== value)
    );
  };

  const formattedCreatedAt = formatDate(post.createdAt);

  return (
    <div className="p-4 bg-dark rounded-lg shadow border border-light/30 relative space-y-3 overflow-hidden">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-sm text-white/70 mb-1 flex-grow min-w-0">
          <Image
            src={post.user?.image || '/default-avatar.svg'}
            alt={post.user?.name || 'Author'}
            width={24}
            height={24}
            className="rounded-full bg-medium flex-shrink-0"
            onError={(e) => {
              e.currentTarget.src = '/default-avatar.svg';
            }}
          />
          <span className="truncate font-medium text-white/80">
            {post.user?.name || 'Unknown Author'}
          </span>
          <span className="text-white/50">•</span>
          <span
            title={new Date(post.createdAt).toISOString()}
            className="flex-shrink-0"
          >
            {formattedCreatedAt}
          </span>
        </div>

        {!isEditing && (
          <div className="flex gap-2 items-center flex-shrink-0">
            {canEditThisPost && (
              <button
                onClick={handleEditClick}
                disabled={isDeleting || isUpdating}
                className="p-1 text-white/60 hover:text-brand disabled:opacity-50"
                title="Edit Post"
              >
                <Pencil size={16} />
              </button>
            )}
            {canDeleteThisPost && (
              <button
                onClick={handleDeletePostClick}
                disabled={isDeleting || isUpdating}
                className="p-1 text-white/60 hover:text-red-500 disabled:opacity-50"
                title="Delete Bulletin Post"
              >
                {isDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            )}
            {deleteError && (
              <p className="text-xs text-red-400 absolute right-0 top-full mt-1 whitespace-nowrap">
                {deleteError}
              </p>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleUpdate} className="space-y-3 pt-2">
          <div>
            <label
              htmlFor={`eventType-${post.id}`}
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Post Type*
            </label>
            <select
              id={`eventType-${post.id}`}
              value={editedEventType}
              onChange={(e) => setEditedEventType(e.target.value)}
              className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent text-sm"
              disabled={isUpdating}
            >
              <option value="EVENT">One-Time Event</option>
              <option value="RECURRING">Recurring (Club Meeting, etc.)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor={`title-${post.id}`}
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Title*
            </label>
            <input
              id={`title-${post.id}`}
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              required
              className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              disabled={isUpdating}
            />
          </div>

          <div>
            <label
              htmlFor={`content-${post.id}`}
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Content*
            </label>
            <textarea
              id={`content-${post.id}`}
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              required
              rows={5}
              className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-y min-h-[100px]"
              disabled={isUpdating}
            />
          </div>

          <div>
            <label
              htmlFor={`location-${post.id}`}
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Location (Optional)
            </label>
            <input
              type="text"
              id={`location-${post.id}`}
              value={editedLocation}
              onChange={(e) => setEditedLocation(e.target.value)}
              placeholder="e.g., MSC Ballroom"
              className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              disabled={isUpdating}
            />
          </div>

          {editedEventType === 'EVENT' && (
            <div>
              <label
                htmlFor={`eventDate-${post.id}`}
                className="block text-sm font-medium text-white/70 mb-1"
              >
                Event Date (Optional)
              </label>
              <input
                type="date"
                id={`eventDate-${post.id}`}
                value={editedEventDate}
                onChange={(e) => setEditedEventDate(e.target.value)}
                className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                disabled={isUpdating}
              />
            </div>
          )}

          {editedEventType === 'RECURRING' && (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Recurring Days (Optional)
              </label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {[
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                  'Sunday',
                ].map((day) => (
                  <label
                    key={day}
                    className="flex items-center space-x-2 text-sm text-white/80"
                  >
                    <input
                      type="checkbox"
                      value={day}
                      checked={editedRecurringDays.includes(day)}
                      onChange={handleRecurringDayChange}
                      className="rounded border-light text-brand focus:ring-brand disabled:opacity-50"
                      disabled={isUpdating}
                    />
                    <span>{day}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor={`eventTime-${post.id}`}
              className="block text-sm font-medium text-white/70 mb-1"
            >
              Time (Optional)
            </label>
            <input
              type="text"
              id={`eventTime-${post.id}`}
              value={editedEventTime}
              onChange={(e) => setEditedEventTime(e.target.value)}
              placeholder="e.g., 7:00 PM"
              className="w-full px-3 py-2 bg-medium border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              disabled={isUpdating}
            />
          </div>

          {updateError && <p className="text-xs text-red-400">{updateError}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={isUpdating}
              className="flex items-center px-3 py-1 rounded-md text-sm text-white bg-gray-500 hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <XCircle size={16} className="inline mr-1" /> Cancel
            </button>
            <button
              type="submit"
              disabled={
                isUpdating || !editedContent.trim() || !editedTitle.trim()
              }
              className="flex items-center px-3 py-1 rounded-md text-sm text-white bg-brand hover:bg-opacity-85 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isUpdating ? (
                <Loader2 size={16} className="animate-spin inline mr-1" />
              ) : (
                <Save size={16} className="inline mr-1" />
              )}
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <div>
          {post.flyerImageUrl && (
            <div className="my-3 max-h-60 overflow-hidden rounded-md border border-light/20 flex justify-center items-center bg-medium">
              <Image
                src={post.flyerImageUrl}
                alt={`${post.title} Flyer`}
                width={400}
                height={240}
                className="object-contain"
              />
            </div>
          )}
          <h3 className="text-lg font-semibold text-white/90 pt-1">
            {post.title}
          </h3>
          <p className="text-white/80 whitespace-pre-wrap break-words mb-2">
            {post.content}
          </p>
          <div className="space-y-1 text-sm text-white/70 border-t border-light/20 pt-3 mt-3">
            {post.eventType === 'EVENT' && post.eventDate && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="shrink-0 text-amber-400" />
                <span className="font-medium text-white/80">Date:</span>
                <span>{formatDate(post.eventDate, { dateStyle: 'full' })}</span>
              </div>
            )}
            {post.eventType === 'RECURRING' &&
              post.recurringDays &&
              post.recurringDays.length > 0 && (
                <div className="flex items-center gap-2">
                  <Repeat size={14} className="shrink-0 text-sky-400" />
                  <span className="font-medium text-white/80">Recurs:</span>
                  <span>{post.recurringDays.join(', ')}</span>
                </div>
              )}
            {post.eventTime && (
              <div className="flex items-center gap-2">
                <Clock size={14} className="shrink-0 text-lime-400" />
                <span className="font-medium text-white/80">Time:</span>
                <span>{post.eventTime}</span>
              </div>
            )}
            {post.location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="shrink-0 text-fuchsia-400" />
                <span className="font-medium text-white/80">Location:</span>
                <span>{post.location}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-white/60 border-b border-light/20 pb-3 mt-3">
            <button
              onClick={handleLikeToggle}
              disabled={isLiking || !currentUserId}
              className={`flex items-center gap-1 p-1 rounded hover:bg-light disabled:opacity-50 ${
                post.currentUserHasLiked
                  ? 'text-brand'
                  : 'text-white/60 hover:text-brand'
              }`}
              title={
                !currentUserId
                  ? 'Log in to like'
                  : post.currentUserHasLiked
                  ? 'Unlike'
                  : 'Like'
              }
            >
              <ThumbsUp
                size={16}
                fill={post.currentUserHasLiked ? 'currentColor' : 'none'}
              />
              <span>{post.likeCount}</span>
            </button>
            <button
              onClick={handleToggleComments}
              className="flex items-center gap-1 p-1 rounded hover:bg-light"
              title={showComments ? 'Hide comments' : 'Show comments'}
            >
              <MessageSquare size={16} />
              <span>{post.commentCount ?? 0}</span>
            </button>
            {likeError && (
              <p className="text-xs text-red-400 ml-auto">{likeError}</p>
            )}
          </div>

          {showComments && (
            <div className="pt-2 space-y-3">
              {isLoadingComments && (
                <Loader2
                  size={18}
                  className="animate-spin text-white/50 mx-auto my-2"
                />
              )}
              {commentsError && (
                <p className="text-xs text-red-400 text-center">
                  {commentsError}
                </p>
              )}
              {!isLoadingComments &&
                !commentsError &&
                comments.length === 0 && (
                  <p className="text-xs text-white/50 text-center py-2">
                    No comments yet.
                  </p>
                )}
              {!isLoadingComments && !commentsError && comments.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2 -mr-2">
                  {comments.map((comment) => (
                    <BulletinCommentItem
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      postSchoolId={post.schoolId}
                      onDeleteComment={handleDeleteComment}
                      post={post}
                    />
                  ))}
                </div>
              )}
              {currentUserId && (
                <form
                  onSubmit={handleCommentSubmit}
                  className="flex gap-2 pt-3 border-t border-light/20"
                >
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-grow px-3 py-1.5 bg-medium border border-light rounded-md text-sm text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-brand"
                    disabled={isSubmittingComment}
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingComment || !newComment.trim()}
                    className="px-3 py-1.5 rounded-md bg-brand text-white text-sm font-semibold hover:bg-opacity-85 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isSubmittingComment ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      'Post'
                    )}
                  </button>
                </form>
              )}
              {submitCommentError && (
                <p className="text-xs text-red-400 mt-1">
                  {submitCommentError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
