'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';

export default function ProfilePage() {
  const { status } = useSession();
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === 'authenticated') {
      setIsLoading(true);
      fetch('/api/user/profile')
        .then((res) => {
          if (!res.ok)
            throw new Error(`Failed to fetch profile (${res.status})`);
          return res.json();
        })
        .then((data) => {
          setUserProfile(data);
        })
        .catch((err) => {
          setUserProfile(null);
        })
        .finally(() => setIsLoading(false));
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

  if (userProfile) {
    return (
      <main className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white">My Profile</h1>

        <div className="p-6 bg-dk-green rounded-lg shadow border border-md-green/50 space-y-4">
          <div className="flex justify-center sm:justify-start">
            {userProfile.image ? (
              <Image
                src={userProfile.image}
                alt="Profile picture"
                width={100}
                height={100}
                className="rounded-full border-2 border-brand-green"
                priority
              />
            ) : (
              <div className="w-[100px] h-[100px] rounded-full bg-charcoal flex items-center justify-center text-white/50 text-sm border-2 border-md-green">
                No Image
              </div>
            )}
          </div>

          <div>
            <p className="text-sm text-white/70">Display Name:</p>
            <p className="text-lg text-white">
              {userProfile.name ?? 'Not Set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/70">Email:</p>
            <p className="text-lg text-white">
              {userProfile.email ?? 'Not Available'}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/70">Major:</p>
            <p className="text-lg text-white">
              {userProfile.major ?? 'Not Set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-white/70">Role:</p>
            <p className="text-lg text-white capitalize">{userProfile.role}</p>
          </div>

          <div className="pt-4">
            <button
              disabled
              className="px-4 py-2 rounded bg-brand-green text-white opacity-50 cursor-not-allowed"
            >
              Edit Profile (Coming Soon)
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <p>Please log in to view your profile.</p>
    </main>
  );
}
