'use client';

import GoogleSignInButton from '@/features/auth/components/GoogleSignInButton';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center bg-dark px-4 py-12">
      <div className="w-full max-w-md p-6 md:p-10 bg-medium rounded-xl shadow-lg border border-light/50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to FloorMates
          </h1>
          <p className="text-sm text-white/70">
            Sign in to connect with your floor.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <GoogleSignInButton />
          </div>
        </div>
      </div>
    </div>
  );
}
