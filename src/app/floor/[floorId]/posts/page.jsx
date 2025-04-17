'use client';

import React, { useCallback, useEffect, useState } from 'react';
import CreatePostForm from '@/features/posts/components/CreatePostForm';
import FloorPostsList from '@/features/posts/components/FloorPostsList';

export default function FloorPostsPage({ params }) {
  const targetFloorId = params?.floorId;

  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);

  const fetchPosts = useCallback(
    async (showLoading = true) => {
      if (!targetFloorId) {
        setIsLoadingPosts(false);
        setPostsError('Floor ID is missing.');
        return;
      }

      if (showLoading) setIsLoadingPosts(true);
      setPostsError(null);
      try {
        const response = await fetch(`/api/floors/${targetFloorId}/posts`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch posts');
        }
        setPosts(data); // API now returns sorted posts with upvote status
      } catch (err) {
        setPostsError(err.message || 'Could not load posts.');
      } finally {
        if (showLoading) setIsLoadingPosts(false);
      }
    },
    [targetFloorId]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
    fetchPosts(false);
  };

  const handleDeletePost = (postId) => {
    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId)
    );
  };

  const handleUpdatePost = (updatedPost) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === updatedPost.id ? updatedPost : post
      )
    );
  };

  const handlePostsNeedRefresh = useCallback(() => {
    console.log('Refreshing posts due to upvote change...');
    fetchPosts(false);
  }, [fetchPosts]);

  if (!targetFloorId) {
    return (
      <main className="p-6">
        <p className="text-red-500">Error: Could not determine Floor ID.</p>
      </main>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6 space-y-6">
      <CreatePostForm
        floorId={targetFloorId}
        onPostCreated={handlePostCreated}
      />
      <FloorPostsList
        key={isLoadingPosts ? 'loading' : 'loaded'}
        posts={posts}
        isLoading={isLoadingPosts}
        error={postsError}
        onDeletePost={handleDeletePost}
        onUpdatePost={handleUpdatePost}
        onPostsNeedRefresh={handlePostsNeedRefresh}
      />
    </div>
  );
}
