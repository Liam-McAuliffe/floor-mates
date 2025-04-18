'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import CreatePostForm from '@/features/posts/components/CreatePostForm';
import FloorPostsList from '@/features/posts/components/FloorPostsList';

export default function FloorPostsPage({ params }) {
  const targetFloorId = params?.floorId;

  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchPosts = useCallback(
    async (showLoading = true) => {
      if (!targetFloorId) {
        if (isMounted.current) {
          setIsLoadingPosts(false);
          setPostsError('Floor ID is missing.');
        }
        return;
      }

      if (showLoading && isMounted.current) setIsLoadingPosts(true);
      if (isMounted.current) setPostsError(null);

      try {
        const response = await fetch(`/api/floors/${targetFloorId}/posts`);
        if (!isMounted.current) return;

        const data = await response.json();
        if (!isMounted.current) return;

        if (!response.ok) {
          throw new Error(
            data.error || `Failed to fetch posts (${response.status})`
          );
        }
        setPosts(data);
        setPostsError(null);
      } catch (err) {
        if (isMounted.current) {
          console.error('Fetch posts error:', err);
          setPostsError(err.message || 'Could not load posts.');
        }
      } finally {
        if (isMounted.current) {
          setIsLoadingPosts(false);
        }
      }
    },
    [targetFloorId]
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePostCreated = (newPost) => {
    setPosts((currentPosts) => {
      const updatedPosts = [newPost, ...currentPosts];
      updatedPosts.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return updatedPosts;
    });
  };

  const handleDeletePost = (postId) => {
    setPosts((currentPosts) =>
      currentPosts.filter((post) => post.id !== postId)
    );
  };

  const handleUpdatePost = (postId, updatedPostData) => {
    setPosts((currentPosts) => {
      const updatedPosts = currentPosts.map((post) =>
        post.id === postId ? { ...post, ...updatedPostData } : post
      );
      updatedPosts.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return updatedPosts;
    });
  };

  const handlePostInteractionRefresh = useCallback(() => {
    setPosts((currentPosts) => {
      const newlySortedPosts = [...currentPosts];
      newlySortedPosts.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        if (a.upvoteCount !== b.upvoteCount)
          return b.upvoteCount - a.upvoteCount;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      return newlySortedPosts;
    });
  }, []);

  if (!targetFloorId) {
    return (
      <main className="p-6">
        <p className="text-red-500">Error: Could not determine Floor ID.</p>
      </main>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6 space-y-6">
      {targetFloorId && (
        <CreatePostForm
          floorId={targetFloorId}
          onPostCreated={handlePostCreated}
        />
      )}
      <FloorPostsList
        key={
          isLoadingPosts
            ? 'loading'
            : posts
                .map(
                  (p) => `${p.id}-${p.upvoteCount}-${p.currentUserHasUpvoted}`
                )
                .join('_')
        }
        posts={posts}
        isLoading={isLoadingPosts}
        error={postsError}
        onDeletePost={handleDeletePost}
        onUpdatePost={handleUpdatePost}
        onPostsNeedRefresh={handlePostInteractionRefresh}
      />
    </div>
  );
}
