'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ProfileEditForm from '@/features/profile/components/ProfileEditForm';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoading(true);
      fetch('/api/user/profile')
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch profile (${res.status})`);
          }
          return res.json();
        })
        .then((data) => {
          setUserProfile(data);
          setError(null);
        })
        .catch((err) => {
          console.error('Failed to fetch user profile:', err);
          setError(err.message);
          setUserProfile(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
      setUserProfile(null);
    }
  }, [status]);

  if (isLoading || status === 'loading') {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold text-white mb-6">My Profile</h1>
        <p className="text-white/70">Loading profile data...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-3xl font-bold text-white mb-4">My Profile</h1>
        <p className="text-red-400">Error loading profile: {error}</p>
      </main>
    );
  }

  if (status === 'authenticated' && userProfile) {
    return (
      <main className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white">Edit Profile</h1>

        <ProfileEditForm initialData={userProfile} />
      </main>
    );
  }

  return (
    <main className="p-6">
      <p>Please log in.</p>
    </main>
  );
}
