// src/app/api/user/profile/route.js
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  let session;
  try {
    session = await auth();
  } catch {
    session = null;
  }

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        major: true,
        role: true,
        createdAt: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(userProfile);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch profile data from DB' },
      { status: 500 }
    );
  }
}
