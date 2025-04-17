'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import { Home, User, MessageSquare, LayoutList } from 'lucide-react';
import LogoutButton from '@/features/auth/components/LogOutButton';
import Image from 'next/image';

const Sidebar = () => {
  const pathname = usePathname();
  const { status } = useSession();
  const userProfile = useSelector(selectUserProfile);

  const baseNavLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  let dynamicFloorLinks = [];
  const userFloorId = userProfile?.floorId;

  if (userFloorId) {
    dynamicFloorLinks = [
      {
        name: 'Floor Posts',
        icon: LayoutList,
        href: `/floor/${userFloorId}/posts`,
      },
      {
        name: 'Floor Chat',
        icon: MessageSquare,
        href: `/floor/${userFloorId}/chat`,
      },
    ];
  } else if (status === 'authenticated') {
    dynamicFloorLinks = [
      { name: 'Join a Floor', icon: MessageSquare, href: '/floor/join' },
    ];
  }

  const navLinks = [...baseNavLinks, ...dynamicFloorLinks];

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const displayName = userProfile?.name ?? userProfile?.email ?? 'User';
  const displayImage = userProfile?.image;

  return (
    <aside className="w-64 bg-medium p-5 text-white/[0.87] flex flex-col shrink-0 border-r border-light/20">
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
                      ? 'bg-brand text-white font-medium shadow-sm'
                      : 'text-white/70 hover:bg-light hover:text-white'
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

      <div className="mt-auto border-t border-light/30 pt-4">
        <div className="flex items-center justify-between p-1 rounded transition-colors">
          {displayImage ? (
            <Image
              src={displayImage}
              alt="Avatar"
              width={28}
              height={28}
              className="rounded-full mr-2 bg-dark"
            />
          ) : (
            <div className="w-7 h-7 rounded-full mr-2 bg-dark border border-light flex items-center justify-center text-xs text-white/50">
              {displayName?.charAt(0)?.toUpperCase() || '?'}
            </div>
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
