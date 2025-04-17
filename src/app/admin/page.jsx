'use client';

import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import { useSession } from 'next-auth/react';
import CreateFloorForm from '@/features/admin/components/CreateFloorForm'; // Adjust path if needed

export default function AdminPage() {
  const { status } = useSession();
  const userProfile = useSelector(selectUserProfile);

  if (status === 'loading' || !userProfile) {
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
    <main className="p-6 space-y-6">
      <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
      <CreateFloorForm />
    </main>
  );
}
