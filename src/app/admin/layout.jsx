'use client';

import { useSelector } from 'react-redux';
import { useSession } from 'next-auth/react';
import { selectUserProfile } from '@/store/slices/userSlice';

export default function AdminLayout({ children }) {
  const { status } = useSession();
  const userProfile = useSelector(selectUserProfile);

  if (status === 'loading' || (status === 'authenticated' && !userProfile)) {
    return (
      <main className="p-6">
        <p className="text-white/70">Loading admin tools...</p>
      </main>
    );
  }

  if (status !== 'authenticated' || userProfile.role !== 'admin') {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
        <p className="text-white/70">
          You do not have permission to view this page.
        </p>
      </main>
    );
  }

  return (
    <main className="p-6 space-y-8">
      <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
      {children}
    </main>
  );
}
