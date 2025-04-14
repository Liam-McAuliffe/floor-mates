'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';
import LogOutButton from './LogOutButton';
import GoogleSignInButton from './GoogleSignInButton';

export default function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div style={{ padding: '10px' }}>Loading session...</div>;
  }

  if (status === 'authenticated') {
    return (
      <div className="flex gap-3 p-4">
        {session.user?.image && (
          <Image
            src={session.user.image}
            alt="User avatar"
            className="rounded-full"
            width={24}
            height={24}
          />
        )}
        <div>
          <strong>
            {session.user?.email ?? session.user?.name ?? 'Unknown'}
          </strong>
        </div>
        <LogOutButton />
      </div>
    );
  } else {
    return <GoogleSignInButton />;
  }
}
