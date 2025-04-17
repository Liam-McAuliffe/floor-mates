'use client';

import React, { useEffect, useState } from 'react';
import CreatePostForm from '@/features/posts/components/CreatePostForm';
import FloorPostsList from '@/features/posts/components/FloorPostsList';

export default function FloorPostsPage({ params }) {
  const targetFloorId = params?.floorId;

  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);

  useEffect(() => {
    if (!targetFloorId) return;

    const fetchPosts = async () => {
      setIsLoadingPosts(true);
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
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [targetFloorId]);

  const handlePostCreated = (newPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
  };

  return (
    <main className="flex flex-col h-full overflow-y-auto">
      <div className="flex-grow p-4 md:p-6 space-y-6">
        <CreatePostForm
          floorId={targetFloorId}
          onPostCreated={handlePostCreated}
        />
        <FloorPostsList
          posts={posts}
          isLoading={isLoadingPosts}
          error={postsError}
        />
      </div>
    </main>
  );
}
