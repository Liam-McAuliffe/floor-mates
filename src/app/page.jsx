'use client';
import AuthStatus from '@/features/auth/components/AuthStatus';

export default function Home() {
  return (
    <main>
      <h1>Welcome to the Home Page</h1>
      <p>This is the main content of the home page.</p>
      <AuthStatus />
    </main>
  );
}
