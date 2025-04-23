'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUserProfile,
  selectUserStatus,
  fetchUserProfile,
  clearUser, // Import clearUser if needed for logout/unauth scenarios
} from '@/store/slices/userSlice'; // Adjust path
import ProfileEditForm from '@/features/profile/components/ProfileEditForm'; // Adjust path
import RequestBulletinAccess from '@/features/profile/components/RequestBulletinAccess'; // <-- Import the new component

export default function ProfilePage() {
  const { status: sessionStatus } = useSession();
  const dispatch = useDispatch();
  const userProfile = useSelector(selectUserProfile);
  const userStatus = useSelector(selectUserStatus); // 'idle', 'loading', 'succeeded', 'failed'

  const [error, setError] = useState(null); // Local error state for profile loading

  // Fetch profile if authenticated and profile is not loaded/failed
  useEffect(() => {
    if (
      sessionStatus === 'authenticated' &&
      (userStatus === 'idle' || userStatus === 'failed') // Retry fetch if failed previously
    ) {
      setError(null); // Clear previous fetch errors
      dispatch(fetchUserProfile())
        .unwrap()
        .catch((err) => {
          console.error('Failed to fetch user profile on mount/retry:', err);
          // Set local error state, userSlice already handles its own error state
          setError(
            err.message || 'Failed to load profile data. Please try again.'
          );
        });
    } else if (sessionStatus === 'unauthenticated') {
      // Optional: Clear user data from Redux if session becomes unauthenticated
      // if (userStatus !== 'idle') {
      //   dispatch(clearUser());
      // }
      setError(null); // Clear errors on logout
    }
  }, [sessionStatus, userStatus, dispatch]);

  if (userStatus === 'loading' || sessionStatus === 'loading') {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold text-white mb-6 animate-pulse bg-medium rounded w-1/2 h-8"></h1>
        <div className="p-6 bg-medium rounded-lg shadow border border-light/50 space-y-6 animate-pulse">
          <div className="h-24 w-24 rounded-full bg-dark"></div>
          <div className="h-6 bg-dark rounded w-3/4"></div>
          <div className="h-6 bg-dark rounded w-1/2"></div>
          <div className="h-10 bg-dark rounded w-1/4"></div>
        </div>
      </main>
    );
  }

  // Unauthenticated state
  if (sessionStatus === 'unauthenticated') {
    // Should be handled by middleware, but good to have a fallback
    return (
      <main className="p-6 text-center">
        <p className="text-white/70">Please log in to view your profile.</p>
        {/* Optionally add a login button here */}
      </main>
    );
  }

  // Error state during initial profile load
  if (userStatus === 'failed' && !userProfile) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold text-white mb-4">My Profile</h1>
        <p className="text-red-400">
          Error loading profile: {error || 'Could not load profile data.'}
        </p>
        {/* Optionally add a retry button */}
      </main>
    );
  }

  // Authenticated and profile loaded (or potentially failed but showing anyway)
  if (sessionStatus === 'authenticated' && userProfile) {
    return (
      <main className="p-6 space-y-8">
        {/* Profile Editing Section */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">Edit Profile</h1>
          <ProfileEditForm initialData={userProfile} />
          {/* Display profile load error here if it occurred but we still have profile data */}
          {userStatus === 'failed' && error && (
            <p className="text-sm text-red-400 mt-2">{error}</p>
          )}
        </div>

        {/* Bulletin Access Request Section */}
        {/* Only show if user is not RA/Admin */}
        {userProfile.role !== 'admin' && userProfile.role !== 'RA' && (
          <div>
            <RequestBulletinAccess />
          </div>
        )}

        {/* Add other profile sections here */}
      </main>
    );
  }

  // Fallback if authenticated but profile is somehow null without an error state
  // This case should ideally not happen with the useEffect logic
  return (
    <main className="p-6">
      <p className="text-white/70">Loading profile information...</p>
    </main>
  );
}
