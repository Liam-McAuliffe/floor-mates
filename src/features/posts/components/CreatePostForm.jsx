'use client';

import { useState } from 'react';

export default function CreatePostForm({ floorId, onPostCreated }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!content.trim()) {
      setError('Post content cannot be empty.');
      return;
    }

    if (!floorId) {
      setError('Cannot create post: Floor ID is missing.');
      console.error('[CreatePostForm] floorId prop is missing.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/floors/${floorId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || null,
          content: content.trim(),
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.error || `Failed to create post (${response.status})`
        );
      }

      setSuccessMessage('Post created successfully!');
      setTitle('');
      setContent('');

      if (onPostCreated && typeof onPostCreated === 'function') {
        onPostCreated(responseData);
      }
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'An unexpected error occurred.');
      setSuccessMessage(null);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-medium rounded-lg shadow border border-light/50">
      <h2 className="text-lg font-semibold text-white mb-4">
        Create a New Post
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="postTitle"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Title (Optional)
          </label>
          <input
            type="text"
            id="postTitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcements, questions, etc."
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label
            htmlFor="postContent"
            className="block text-sm font-medium text-white/70 mb-1"
          >
            Content*
          </label>
          <textarea
            id="postContent"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            required
            className="w-full px-3 py-2 bg-dark border border-light rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent resize-y min-h-[80px]"
            disabled={isSubmitting}
          />
        </div>

        <div className="flex flex-col items-start gap-2 pt-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg hover:cursor-pointer bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand disabled:opacity-50 disabled:cursor-wait"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Create Post'}
          </button>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          {successMessage && (
            <p className="mt-2 text-sm text-green-400">{successMessage}</p>
          )}
        </div>
      </form>
    </div>
  );
}
