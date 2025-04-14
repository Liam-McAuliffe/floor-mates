'use client';
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function LogOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="hover:cursor-pointer"
    >
      <LogOut />
    </button>
  );
}
