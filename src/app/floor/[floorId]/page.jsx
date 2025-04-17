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

  const isLoading =
    isLoadingUserProfile || (isAuthorized && isLoadingFloorDetails);

  if (isLoading) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
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

  if (isAuthorized && floorDetailsError) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Error Loading Floor Details
        </h1>
        <p className="text-red-400">{floorDetailsError}</p>
        <div className="flex-grow min-h-0 mt-4">
          <ChatInterface />
        </div>
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

  const displayFloorName = floorDetails
    ? `${floorDetails.buildingName}: ${floorDetails.name}`
    : `Floor ${targetFloorId}`;

  return (
    <main className="flex flex-col h-full">
      <div className="p-6 border-b border-light/30">
        <h1 className="text-3xl font-bold text-white">
          {isLoadingFloorDetails
            ? `Loading Floor ${targetFloorId}...`
            : `${displayFloorName}`}
        </h1>
      </div>

      <div className="flex-grow min-h-0">
        <ChatInterface />
      </div>
    </main>
  );
}
