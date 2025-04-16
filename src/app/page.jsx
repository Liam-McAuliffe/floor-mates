'use client';

import { useSession } from 'next-auth/react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';

export default function HomePage() {
  const { status } = useSession();
  const userProfile = useSelector(selectUserProfile);

  if (status === 'loading') {
    return (
      <main className="space-y-4 p-6">
        <div className="h-8 bg-medium rounded w-1/2 animate-pulse"></div>
        <div className="h-6 bg-medium rounded w-3/4 animate-pulse"></div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="p-6">
        <p>Redirecting...</p>
      </main>
    );
  }

  const displayName = userProfile?.name ?? userProfile?.email ?? 'FloorMate';

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {displayName}!
        </h1>
      </div>
    </main>
  );
}
