'use client';

import JoinFloorForm from '@/features/floors/components/JoinFloorForm';
import { selectUserProfile } from '@/store/slices/userSlice';
import Link from 'next/link';
import { useSelector } from 'react-redux';

export default function JoinFlorr() {
  const userProfile = useSelector(selectUserProfile);

  const hasFloor = !!(
    userProfile?.floorId || userProfile?.floorMemberships?.length > 0
  );
  const currentFloorId =
    userProfile?.floorId || userProfile?.floorMemberships?.[0]?.floorId;
  return (
    <div>
      {hasFloor ? (
        <div className="text-center p-4 bg-medium rounded-lg border border-light/50">
          <p className="text-white/80 mb-2">
            You are currently a member of a floor.
          </p>
          <Link
            href={`/floor/${currentFloorId}`}
            className="inline-block px-4 py-2 rounded bg-brand text-white font-semibold hover:bg-opacity-85 transition"
          >
            Go to My Floor Chat
          </Link>
        </div>
      ) : (
        <JoinFloorForm />
      )}
    </div>
  );
}
