'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectUserProfile,
  selectUserStatus,
  fetchUserProfile,
} from '@/store/slices/userSlice';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';

export default function ProfilePage() {
  const { status: sessionStatus } = useSession();
  const dispatch = useDispatch();
  const userProfile = useSelector(selectUserProfile);
  const userStatus = useSelector(selectUserStatus);

  const [error, setError] = useState(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && userStatus === 'idle') {
      dispatch(fetchUserProfile())
        .unwrap()
        .catch((err) => {
          console.error('Failed to fetch user profile on mount:', err);
          setError(err.message || 'Failed to load profile');
        });
    } else if (sessionStatus === 'unauthenticated') {
      setError(null);
    }
  }, [sessionStatus, userStatus, dispatch]);

  if (userStatus === 'loading' || sessionStatus === 'loading') {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>
        <p className="text-white/70">Loading profile data...</p>
      </main>
    );
  }

  if (userStatus === 'failed' && error) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold text-white mb-4">My Profile</h1>
        <p className="text-red-400">Error loading profile: {error}</p>
      </main>
    );
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <main className="p-6">
        <p>Please log in to view your profile.</p>
      </main>
    );
  }

  if (sessionStatus === 'authenticated' && userProfile) {
    return (
      <main className="p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">Edit Profile</h1>
          <ProfileEditForm initialData={userProfile} />
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <p>Could not load profile information.</p>
    </main>
  );
}
