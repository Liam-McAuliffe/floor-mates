'use client';

import { useSession } from 'next-auth/react';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <main className="space-y-4 p-6">
        <div className="h-8 bg-dk-green rounded w-1/2 animate-pulse"></div>
        <div className="h-6 bg-dk-green rounded w-3/4 animate-pulse"></div>
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

  const displayName =
    session?.user?.name ?? session?.user?.email ?? 'FloorMate';

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
