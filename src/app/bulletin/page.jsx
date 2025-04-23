'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice'; // Adjust path

import BulletinPostItem from '@/features/bulletin/components/BulletinPostItem'; // Adjust path
import CreateBulletinPostForm from '@/features/bulletin/components/CreateBulletinPostForm'; // Adjust path
import { Loader2 } from 'lucide-react'; // For loading indicator

export default function BulletinPage() {
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);
  const userProfile = useSelector(selectUserProfile);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [bulletinAccessStatus, setBulletinAccessStatus] = useState(null);
  const [isLoadingAccessStatus, setIsLoadingAccessStatus] = useState(true);
  const [accessStatusError, setAccessStatusError] = useState(null);

  // Fetch bulletin posts
  const fetchBulletinPosts = useCallback(async () => {
    setIsLoadingPosts(true);
    setPostsError(null);
    try {
      const response = await fetch('/api/bulletin');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch bulletin posts');
      }
      setPosts(data);
    } catch (err) {
      console.error('Error fetching bulletin posts:', err);
      setPostsError(err.message);
      setPosts([]);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []); // No dependencies needed here usually

  // Fetch Access Status
  const fetchAccessStatus = useCallback(async () => {
    // Skip fetch if user is Admin/RA - they always have access
    if (userProfile?.role === 'admin' || userProfile?.role === 'RA') {
      console.log('[BulletinPage] Setting status fetch complete for Admin/RA.');
      setBulletinAccessStatus('APPROVED');
      setIsLoadingAccessStatus(false);
      return;
    }

    // --- REMOVED the check for isLoadingAccessStatus here ---
    // if (isLoadingAccessStatus) {
    //     console.log('[BulletinPage] Skipping status fetch, already loading.');
    //     return;
    // }

    console.log('[BulletinPage] Fetching access status...');
    setIsLoadingAccessStatus(true); // Set loading true *before* fetch
    setAccessStatusError(null);
    try {
      const response = await fetch('/api/bulletin/access-requests/status');
      const data = await response.json();
      console.log('[BulletinPage] Fetched access status data:', data);
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch access status');
      }
      setBulletinAccessStatus(data.status);
    } catch (err) {
      console.error(
        '[BulletinPage] Error fetching bulletin access status:',
        err
      );
      setAccessStatusError(err.message);
      setBulletinAccessStatus(null);
    } finally {
      setIsLoadingAccessStatus(false); // Set loading false *after* fetch/error
    }
    // Only depends on userProfile?.role to decide *if* it needs to run
  }, [userProfile?.role]); // <-- Dependency array only includes role check

  // Fetch posts and status on mount or when user profile *becomes available*
  useEffect(() => {
    if (userProfile) {
      console.log(
        '[BulletinPage] useEffect - User profile available. Fetching posts and status.'
      );
      fetchBulletinPosts();
      fetchAccessStatus();
    } else {
      console.log('[BulletinPage] useEffect - Waiting for user profile.');
      // Reset loading states if profile disappears (e.g., logout)
      setIsLoadingPosts(true);
      setIsLoadingAccessStatus(true);
      setBulletinAccessStatus(null); // Reset status on profile loss
    }
    // Run only when userProfile reference changes (initially null -> object)
  }, [userProfile, fetchBulletinPosts, fetchAccessStatus]);

  // Handlers
  const handleDeletePost = useCallback((postId) => {
    setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId));
  }, []);
  const handleUpdatePost = useCallback((postId, updatedData) => {
    setPosts((currentPosts) =>
      currentPosts.map((p) => (p.id === postId ? { ...p, ...updatedData } : p))
    );
  }, []);
  const handlePostCreated = (newPost) => {
    // Add to list and sort maybe? Or just prepend
    setPosts((currentPosts) =>
      [newPost, ...currentPosts].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    );
    setShowCreateForm(false);
  };

  // Determine if user can create posts
  const canCreatePost =
    userProfile?.role === 'admin' ||
    userProfile?.role === 'RA' ||
    bulletinAccessStatus === 'APPROVED';

  // Combine loading states for general loading indicator (optional)
  // const isLoading = isLoadingPosts || isLoadingAccessStatus;

  // --- Log state just before rendering ---
  // console.log('[BulletinPage] Rendering - Role:', userProfile?.role, 'AccessStatus:', bulletinAccessStatus, 'CanCreatePost:', canCreatePost, 'IsLoadingAccess:', isLoadingAccessStatus);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white">
          School Bulletin Board
        </h1>
        {/* Show button only if status check is complete AND user is authorized */}
        {!isLoadingAccessStatus && canCreatePost && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-opacity-85 transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-medium focus:ring-brand text-sm md:text-base flex-shrink-0"
          >
            {showCreateForm ? 'Cancel' : 'Create Post'}
          </button>
        )}
        {/* Show loading indicator only if status is loading AND user is not Admin/RA */}
        {isLoadingAccessStatus &&
          userProfile?.role !== 'admin' &&
          userProfile?.role !== 'RA' && (
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Loader2 size={16} className="animate-spin" />
              <span>Checking posting permission...</span>
            </div>
          )}
      </div>

      {/* Show create form if toggled and user is authorized */}
      {canCreatePost && showCreateForm && (
        <CreateBulletinPostForm onPostCreated={handlePostCreated} />
      )}

      {/* Loading State for Posts */}
      {isLoadingPosts && (
        <div className="flex justify-center items-center py-6">
          <Loader2 size={24} className="animate-spin text-white/50" />
          <span className="ml-2 text-white/70">Loading posts...</span>
        </div>
      )}

      {/* Error State for Posts */}
      {postsError && (
        <p className="text-red-400 text-center py-4">
          Error loading posts: {postsError}
        </p>
      )}
      {/* Error State for Access Status Check */}
      {accessStatusError && (
        <p className="text-red-400 text-center py-2 text-sm">
          Could not verify posting permission: {accessStatusError}
        </p>
      )}

      {/* Empty State for Posts */}
      {!isLoadingPosts &&
        !postsError &&
        posts.length === 0 &&
        !showCreateForm && (
          <p className="text-white/60 text-center py-4">
            No bulletin posts found for your school yet.
            {/* Add hint for users who might need access */}
            {!isLoadingAccessStatus &&
              !canCreatePost &&
              userProfile?.role !== 'admin' &&
              userProfile?.role !== 'RA' && (
                <span className="block text-sm mt-1">
                  {' '}
                  Need to post? Request access on your profile page.
                </span>
              )}
          </p>
        )}

      {/* Post List */}
      {!isLoadingPosts && !postsError && posts.length > 0 && (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-4 md:gap-6 space-y-4 md:space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="break-inside-avoid mb-4 md:mb-6">
              <BulletinPostItem
                post={post}
                onDeletePost={handleDeletePost}
                onUpdatePost={handleUpdatePost}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
