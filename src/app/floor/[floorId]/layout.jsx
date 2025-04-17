'use client';

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUserProfile,
  selectUserStatus,
  fetchUserProfile,
} from '@/store/slices/userSlice';
import { useSession } from 'next-auth/react';
import InviteModal from '@/features/floors/components/InviteModal';
import { Share2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function FloorLayout({ children, params }) {
  const targetFloorId = params?.floorId;
  const dispatch = useDispatch();
  const userProfile = useSelector(selectUserProfile);
  const userStatus = useSelector(selectUserStatus);
  const { status: sessionStatus } = useSession();
  const pathname = usePathname();

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
    if (isAuthorized && targetFloorId && !floorDetails) {
      const fetchDetails = async () => {
        setIsLoadingFloorDetails(true);
        setFloorDetailsError(null);
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
    } else if (!isAuthorized || !targetFloorId) {
      setIsLoadingFloorDetails(false);
    }
  }, [isAuthorized, targetFloorId, floorDetails]);

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
      <div className="flex flex-col h-full p-6">
        <div className="h-10 bg-medium rounded w-1/2 animate-pulse mb-4"></div>
        <div className="h-8 bg-medium rounded w-1/3 animate-pulse"></div>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
        <p className="text-red-400">{accessError}</p>
      </div>
    );
  }

  if (isAuthorized && floorDetailsError && !floorDetails) {
    return (
      <div className="flex flex-col h-full p-6">
        <h1 className="text-2xl font-bold text-white mb-4">
          Error Loading Floor
        </h1>
        <p className="text-red-400">{floorDetailsError}</p>
        <p className="text-white/70 mt-2">
          Could not load details for floor {targetFloorId}.
        </p>
      </div>
    );
  }

  const displayFloorName = floorDetails
    ? `${floorDetails.buildingName}: ${floorDetails.name}`
    : `Floor ${targetFloorId}`;
  const baseFloorPath = `/floor/${targetFloorId}`;
  const chatPath = `${baseFloorPath}/chat`;
  const postsPath = `${baseFloorPath}/posts`;

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-4 md:p-6 border-b border-light/30 flex-shrink-0 bg-dark sticky top-0 z-20">
          <div className="flex justify-between items-center mb-3">
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
          <nav className="flex gap-4">
            <Link
              href={postsPath}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                pathname === postsPath
                  ? 'bg-brand text-white'
                  : 'text-white/70 hover:bg-light hover:text-white'
              }`}
            >
              Posts
            </Link>
            <Link
              href={chatPath}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                pathname === chatPath
                  ? 'bg-brand text-white'
                  : 'text-white/70 hover:bg-light hover:text-white'
              }`}
            >
              Chat
            </Link>
          </nav>
        </div>

        <div className="flex-grow min-h-0">{children}</div>
      </div>

      <InviteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inviteCode={isFetchingCode ? null : inviteCode}
        floorId={targetFloorId}
      />
    </>
  );
}
