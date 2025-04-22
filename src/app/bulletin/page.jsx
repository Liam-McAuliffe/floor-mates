'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';

import BulletinPostItem from '@/features/bulletin/components/BulletinPostItem';
import CreateBulletinPostForm from '@/features/bulletin/components/CreateBulletinPostForm';

export default function BulletinPage() {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const userProfile = useSelector(selectUserProfile);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchBulletinPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bulletin');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bulletin posts');
      }
      setPosts(data);
    } catch (err) {
      console.error('Error fetching bulletin posts:', err);
      setError(err.message);
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBulletinPosts();
  }, [fetchBulletinPosts]);

  const handleDeletePost = useCallback((postId) => {
    setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId));
  }, []);

  const handleUpdatePost = useCallback((postId, updatedData) => {
    setPosts((currentPosts) =>
      currentPosts.map((p) => (p.id === postId ? { ...p, ...updatedData } : p))
    );
  }, []);

  const handlePostCreated = (newPost) => {
    setPosts((currentPosts) => [newPost, ...currentPosts]);
    setShowCreateForm(false);
  };

  const canCreatePost =
    userProfile?.role === 'admin' || userProfile?.role === 'RA';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-white">School Bulletin Board</h1>
        {canCreatePost && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand"
          >
            {showCreateForm ? 'Cancel' : 'Create Post'}
          </button>
        )}
      </div>

      {canCreatePost && showCreateForm && (
        <CreateBulletinPostForm onPostCreated={handlePostCreated} />
      )}

      {isLoading && (
        <p className="text-white/70 text-center py-4">Loading posts...</p>
      )}
      {error && (
        <p className="text-red-400 text-center py-4">
          Error loading posts: {error}
        </p>
      )}

      {!isLoading && !error && posts.length === 0 && !showCreateForm && (
        <p className="text-white/60 text-center py-4">
          No bulletin posts found for your school yet.
        </p>
      )}

      {!isLoading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <BulletinPostItem
              key={post.id}
              post={post}
              onDeletePost={handleDeletePost}
              onUpdatePost={handleUpdatePost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
