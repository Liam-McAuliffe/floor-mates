'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSelector } from 'react-redux';
import { selectUserProfile } from '@/store/slices/userSlice';
import { Home, Newspaper, User, MessageSquare } from 'lucide-react';
import LogoutButton from '@/features/auth/components/LogOutButton';
import Image from 'next/image';

const Sidebar = () => {
  const pathname = usePathname();
  const { status } = useSession();
  const userProfile = useSelector(selectUserProfile);

  const baseNavLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Bulletin Board', href: '/bulletin', icon: Newspaper },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  let floorLink = null;
  const userFloorId =
    userProfile?.floorId || userProfile?.floorMemberships?.[0]?.floorId;

  if (userFloorId) {
    floorLink = {
      name: 'My Floor Chat',
      href: `/floor/${userFloorId}`,
      icon: MessageSquare,
    };
  }

  const navLinks = floorLink ? [...baseNavLinks, floorLink] : baseNavLinks;

  if (status === 'loading') {
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const displayName = userProfile?.name ?? userProfile?.email ?? 'User';
  const displayImage = userProfile?.image;

  return (
    <aside className="w-64 bg-medium p-5 text-white/[0.87] flex flex-col shrink-0">
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
            const isActive = link.href.startsWith('/floor')
              ? pathname.startsWith('/floor')
              : pathname === link.href;

            return (
              <li key={link.name} className="mb-3">
                <Link
                  href={link.href}
                  className={`flex items-center py-2 px-3 rounded-md transition-colors ${
                    isActive
                      ? 'bg-brand text-white font-medium'
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

      <div className="mt-auto border-t border-light pt-4">
        <div className="flex items-center justify-between p-1 rounded transition-colors">
          {displayImage && (
            <Image
              src={displayImage}
              alt="Avatar"
              width={26}
              height={26}
              className="rounded-full mr-2"
            />
          )}

          <span
            className="text-md font-medium text-white truncate flex-1 mr-2"
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
