// src/components/Sidebar.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Newspaper, User } from 'lucide-react';
import LogoutButton from '@/features/auth/components/LogOutButton';
import Image from 'next/image';

const Sidebar = () => {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navLinks = [
    { name: 'Home/Feed', href: '/', icon: Home },
    { name: 'Bulletin Board', href: '/bulletin', icon: Newspaper },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  if (status === 'loading') {
    return (
      <aside className="w-64 h-screen bg-dk-green p-5 text-white/[0.87]">
        <div>Loading...</div>
      </aside>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const displayName = session.user?.name ?? session.user?.email ?? 'User';

  return (
    <aside className="w-64 bg-dk-green p-5 text-white/[0.87] flex flex-col shrink-0">
      <div className="mb-10">
        <Link
          href="/"
          className="text-white text-2xl font-bold hover:text-white/80 transition-colors"
        >
          FloorMates
        </Link>
      </div>

      <nav className="flex-grow">
        <ul>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.name} className="mb-3">
                <Link
                  href={link.href}
                  className={`flex items-center py-2 px-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand-green text-white font-medium'
                      : 'text-white/70 hover:bg-md-green hover:text-white'
                  }`}
                >
                  <link.icon className="w-5 h-5 mr-3 shrink-0" />
                  {link.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto border-t border-md-green pt-4">
        <div className="flex items-center justify-between p-1 rounded transition-colors">
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt="Avatar"
              width={24}
              height={24}
              className="rounded-full mr-2"
            />
          )}

          <span
            className="text-sm font-medium text-white truncate flex-1 mr-2"
            title={displayName}
          >
            {displayName}
          </span>

          <LogoutButton />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
