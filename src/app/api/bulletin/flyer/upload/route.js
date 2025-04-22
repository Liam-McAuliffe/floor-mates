import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json(
      { error: 'Not authenticated or role missing' },
      { status: 401 }
    );
  }
  const userId = session.user.id;
  const userRole = session.user.role;

  if (userRole !== 'admin' && userRole !== 'RA') {
    return NextResponse.json(
      { error: 'Unauthorized: Only RAs and Admins can upload flyers.' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json(
      { error: 'Filename query parameter is required' },
      { status: 400 }
    );
  }

  if (!request.body) {
    return NextResponse.json(
      { error: 'No file body received for upload' },
      { status: 400 }
    );
  }

  let userSchoolId = 'unknown_school';
  try {
    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
      include: { floor: { select: { schoolId: true } } },
    });
    if (membership?.floor?.schoolId) {
      userSchoolId = membership.floor.schoolId;
    }
  } catch (dbError) {
    console.error(
      `[API Flyer Upload] Error fetching school ID for user ${userId}:`,
      dbError
    );
  }

  const blobPath = `bulletin-flyers/${userSchoolId}/${filename}`;

  try {
    const blob = await put(blobPath, request.body, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log('[API /bulletin/flyer/upload] Server PUT successful:', blob);
    return NextResponse.json(blob);
  } catch (error) {
    console.error(
      '[API /bulletin/flyer/upload] Error calling server PUT:',
      error
    );
    if (error.message?.includes('size exceeded')) {
      return NextResponse.json(
        { error: `File size exceeds limit.` },
        { status: 413 }
      );
    }
    return NextResponse.json(
      { error: `Failed to upload file: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
