// src/app/floor/[floorId]/page.jsx
'use client';

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUserProfile,
  selectUserStatus,
  fetchUserProfile,
} from '@/store/slices/userSlice';
import ChatInterface from '@/features/chat/components/ChatInterface';
import { useSession } from 'next-auth/react';
import InviteModal from '@/features/floors/components/InviteModal';
import { Share2 } from 'lucide-react';
import CreatePostForm from '@/features/posts/components/CreatePostForm';
import FloorPostsList from '@/features/posts/components/FloorPostsList';

export default function FloorPage({ params }) {
  const resolvedParams = React.use(params);
  const targetFloorId = resolvedParams?.floorId;
  const dispatch = useDispatch();
  const userProfile = useSelector(selectUserProfile);
  const userStatus = useSelector(selectUserStatus);
  const { status: sessionStatus } = useSession();

  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [floorDetails, setFloorDetails] = useState(null);
  const [isLoadingFloorDetails, setIsLoadingFloorDetails] = useState(true);
  const [floorDetailsError, setFloorDetailsError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteCodeError, setInviteCodeError] = useState(null);
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [posts, setPosts] = useState([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [postsError, setPostsError] = useState(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && userStatus === 'idle') {
      dispatch(fetchUserProfile());
      setIsLoadingUserProfile(true);
      return;
    }

    if (userStatus === 'loading' || sessionStatus === 'loading') {
      setIsLoadingUserProfile(true);
      return;
    }

    setIsLoadingUserProfile(false);

    if (userStatus === 'failed') {
      setAccessError('Failed to load user profile data.');
      setIsAuthorized(false);
      return;
    }

    if (userStatus === 'succeeded' && userProfile) {
      const userActualFloorId = userProfile.floorId;
      if (userActualFloorId && userActualFloorId === targetFloorId) {
        setIsAuthorized(true);
        setAccessError(null);
      } else if (userActualFloorId) {
        setAccessError(
          `Access Denied: You belong to floor ${userActualFloorId}, not ${targetFloorId}.`
        );
        setIsAuthorized(false);
      } else {
        setAccessError('Access Denied: You are not assigned to any floor.');
        setIsAuthorized(false);
      }
    } else if (sessionStatus === 'unauthenticated') {
      setAccessError('Please log in.');
      setIsAuthorized(false);
    }
  }, [userProfile, userStatus, sessionStatus, targetFloorId, dispatch]);

  useEffect(() => {
    if (isAuthorized && targetFloorId) {
      const fetchDetails = async () => {
        setIsLoadingFloorDetails(true);
        setFloorDetailsError(null);
        setFloorDetails(null);

        try {
          const response = await fetch(`/api/floors/${targetFloorId}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || `Failed to fetch floor details (${response.status})`
            );
          }
          setFloorDetails(data);
        } catch (err) {
          setFloorDetailsError(err.message);
        } finally {
          setIsLoadingFloorDetails(false);
        }
      };
      fetchDetails();
    } else {
      setIsLoadingFloorDetails(false);
    }
  }, [isAuthorized, targetFloorId]);

  useEffect(() => {
    if (isAuthorized && targetFloorId) {
      const fetchPosts = async () => {
        setIsLoadingPosts(true);
        setPostsError(null);
        setPosts([]);

        try {
          const response = await fetch(`/api/floors/${targetFloorId}/posts`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.error || `Failed to fetch posts (${response.status})`
            );
          }
          setPosts(data);
        } catch (err) {
          setPostsError(err.message || 'Could not load posts.');
        } finally {
          setIsLoadingPosts(false);
        }
      };

      fetchPosts();
    } else {
      setIsLoadingPosts(false);
      setPosts([]);
      setPostsError(null);
    }
  }, [isAuthorized, targetFloorId]);

  const handlePostCreated = (newPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
  };

  const handleOpenInviteModal = async () => {
    setIsModalOpen(true);
    setInviteCode(null);
    setInviteCodeError(null);
    setIsFetchingCode(true);

    try {
      const response = await fetch(`/api/floors/${targetFloorId}/invite-code`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch invite code');
      }
      setInviteCode(data.inviteCode);
    } catch (err) {
      setInviteCodeError(err.message);
    } finally {
      setIsFetchingCode(false);
    }
  };

  const isLoadingPage =
    isLoadingUserProfile || (isAuthorized && isLoadingFloorDetails);

  if (isLoadingPage) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4 animate-pulse">
          Floor {targetFloorId || '...'}
        </h1>
        <p className="text-white/70">Loading floor data...</p>
      </main>
    );
  }

  if (accessError) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Floor {targetFloorId}
        </h1>
        <p className="text-red-400">{accessError}</p>
      </main>
    );
  }

  if (isAuthorized && floorDetailsError && !floorDetails) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Error Loading Floor Details
        </h1>
        <p className="text-red-400">{floorDetailsError}</p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Floor {targetFloorId}
        </h1>
        <p className="text-red-400">You do not have access to this floor.</p>
      </main>
    );
  }

  const displayFloorName = floorDetails
    ? `${floorDetails.buildingName}: ${floorDetails.name}`
    : `Floor ${targetFloorId}`;

  return (
    <>
      <main className="flex flex-col h-full overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-light/30 flex justify-between items-center sticky top-0 bg-dark z-10">
          <h1 className="text-2xl md:text-3xl font-bold text-white truncate pr-4">
            {displayFloorName}
          </h1>
          {isAuthorized && (
            <button
              onClick={handleOpenInviteModal}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-brand text-white text-sm font-medium hover:bg-opacity-85 transition flex-shrink-0"
              title="Invite others to this floor"
            >
              <Share2 size={16} />
              <span>Invite</span>
            </button>
          )}
        </div>

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
          <hr className="border-light/30 my-6 md:my-8" />
          <div className="h-[70vh] md:h-[80vh]">
            <ChatInterface />
          </div>
        </div>
      </main>

      <InviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inviteCode={isFetchingCode ? null : inviteCode}
        floorId={targetFloorId}
      />
    </>
  );
}
