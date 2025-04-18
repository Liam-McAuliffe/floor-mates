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
        setPosts(data);
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
    console.log('[FloorPostsPage] handlePostCreated called with:', newPost);
    const updatedPosts = [newPost, ...posts];
    updatedPosts.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    setPosts(updatedPosts);
  };

  const handleDeletePost = (postId) => {
    console.log(`[FloorPostsPage] handleDeletePost called for ID: ${postId}`);
    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId)
    );
  };

  const handleUpdatePost = (postId, updatedPostData) => {
    console.log(
      `[FloorPostsPage] handleUpdatePost called for ID: ${postId} with:`,
      updatedPostData
    );
    const updatedPosts = posts.map((post) =>
      post.id === postId ? { ...post, ...updatedPostData } : post
    );
    setPosts(updatedPosts);
  };

  const handlePostInteractionRefresh = useCallback(
    (postId, newCount, newHasUpvoted) => {
      console.log(
        `[FloorPostsPage] handlePostInteractionRefresh called for ID: ${postId}`
      );
      let updatedPosts = posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              upvoteCount: newCount,
              currentUserHasUpvoted: newHasUpvoted,
            }
          : p
      );
      updatedPosts.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned - a.isPinned;
        if (a.upvoteCount !== b.upvoteCount)
          return b.upvoteCount - a.upvoteCount;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setPosts(updatedPosts);
    },
    [posts]
  );

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
        onPostCreated={handlePostCreated} // Pass the updated handler
      />
      <FloorPostsList
        key={
          isLoadingPosts
            ? 'loading'
            : posts.map((p) => p.id + p.upvoteCount).join('-')
        } // More robust key
        posts={posts}
        isLoading={isLoadingPosts}
        error={postsError}
        onDeletePost={handleDeletePost} // Pass the updated handler
        onUpdatePost={handleUpdatePost} // Pass the updated handler
        onPostsNeedRefresh={handlePostInteractionRefresh} // Pass the renamed/updated handler
      />
    </div>
  );
}
