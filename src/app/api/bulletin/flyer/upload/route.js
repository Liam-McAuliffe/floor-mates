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
      { error: 'No file body received' },
      { status: 400 }
    );
  }

  let userSchoolId = null;
  try {
    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
      include: {
        floor: { select: { schoolId: true } },
      },
    });
    if (!membership?.floor?.schoolId) {
      throw new Error('Could not determine user school affiliation.');
    }
    userSchoolId = membership.floor.schoolId;
  } catch (dbError) {
    console.error(
      `[API Flyer Upload] Error fetching user school ID for user ${userId}:`,
      dbError
    );
    return NextResponse.json(
      { error: 'Database error determining school.' },
      { status: 500 }
    );
  }

  const blobPath = `bulletin-flyers/${userSchoolId}/${filename}`;
  console.log(`[API Flyer Upload] Attempting to upload to path: ${blobPath}`);

  try {
    const blob = await put(blobPath, request.body, {
      access: 'public',
      addRandomSuffix: true,
    });

    console.log('[API Flyer Upload] Server PUT successful:', blob);
    return NextResponse.json(blob);
  } catch (error) {
    console.error('[API Flyer Upload] Error calling server PUT:', error);

    if (error.name === 'BlobError') {
      return NextResponse.json(
        { error: `Blob storage error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `Failed to upload flyer: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
