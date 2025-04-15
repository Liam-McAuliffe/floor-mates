'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';
import LogOutButton from './LogOutButton';
import GoogleSignInButton from './GoogleSignInButton';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';

export default function AuthStatus() {
  const { status } = useSession();
  const userProfile = useSelector(selectUserProfile);

  if (status === 'loading') {
    return <div style={{ padding: '10px' }}>Loading session...</div>;
  }

  if (status === 'authenticated') {
    return (
      <div className="flex gap-3 p-4">
        {userProfile?.image && (
          <Image
            src={userProfile.image}
            alt="User avatar"
            className="rounded-full"
            width={24}
            height={24}
          />
        )}
        <div>
          <strong>
            {userProfile?.email ?? userProfile?.name ?? 'Unknown'}
          </strong>
        </div>
        <LogOutButton />
      </div>
    );
  } else {
    return <GoogleSignInButton />;
  }
}
