'use client';

import { signIn } from 'next-auth/react';
import { FaGoogle } from 'react-icons/fa';

export default function GoogleSignInButton() {
  return (
    <button
      onClick={() => signIn('google', { callbackUrl: '/' })}
      className="flex bg-md-green items-center gap-2 p-2 rounded-md hover:bg-dk-green hover:cursor-pointer "
    >
      <FaGoogle />
      Sign in with Google
    </button>
  );
}
