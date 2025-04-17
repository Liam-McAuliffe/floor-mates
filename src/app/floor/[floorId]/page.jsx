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

export default function FloorPage({ params }) {
  const resolvedParams = React.use(params);
  const targetFloorId = resolvedParams?.floorId;
  const dispatch = useDispatch();
  const userProfile = useSelector(selectUserProfile);
  const userStatus = useSelector(selectUserStatus);
  const { status: sessionStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && userStatus === 'idle') {
      console.log(
        '[FloorPage] User profile idle, dispatching fetchUserProfile...'
      );
      dispatch(fetchUserProfile());
      return;
    }

    if (userStatus === 'loading' || sessionStatus === 'loading') {
      setIsLoading(true);
      return;
    }

    if (userStatus === 'failed') {
      setError('Failed to load user profile data.');
      setIsLoading(false);
      setIsAuthorized(false);
      return;
    }

    if (userStatus === 'succeeded' && userProfile) {
      const userActualFloorId =
        userProfile.floorId || userProfile.floorMemberships?.[0]?.floorId;

      console.log(
        `[FloorPage] Checking access: URL Floor=${targetFloorId}, User Floor=${userActualFloorId}`
      );

      if (userActualFloorId && userActualFloorId === targetFloorId) {
        setIsAuthorized(true);
        setError(null);
      } else if (userActualFloorId) {
        setError(
          `Access Denied: You belong to floor ${userActualFloorId}, not ${targetFloorId}.`
        );
        setIsAuthorized(false);
      } else {
        setError('Access Denied: You are not assigned to any floor.');
        setIsAuthorized(false);
      }
      setIsLoading(false);
    } else if (sessionStatus === 'unauthenticated') {
      setError('Please log in.');
      setIsLoading(false);
      setIsAuthorized(false);
    }
  }, [userProfile, userStatus, sessionStatus, targetFloorId, dispatch]);

  if (isLoading) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Floor {targetFloorId}
        </h1>
        <p className="text-white/70">Loading floor access and chat...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Floor {targetFloorId}
        </h1>
        <p className="text-red-400">{error}</p>
      </main>
    );
  }

  if (!isAuthorized) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Floor {targetFloorId}
        </h1>
        <p className="text-red-400">
          You do not have access to this floor's chat.
        </p>
      </main>
    );
  }
  return (
    <main className="flex flex-col h-full">
      <div className="p-6 border-b border-light/30">
        <h1 className="text-3xl font-bold text-white">
          Welcome to Floor {targetFloorId}
        </h1>
      </div>

      <div className="flex-grow min-h-0">
        {' '}
        {/* Important for flex child with overflow */}
        <ChatInterface />
      </div>
    </main>
  );
}
