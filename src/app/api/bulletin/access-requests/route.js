import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    console.log('[API /bulletin/access-requests POST] User not authenticated.');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  console.log(
    `[API /bulletin/access-requests POST] Authenticated user: ${userId}`
  );

  let clubName = null;
  try {
    const body = await request.json();
    if (body?.clubName && typeof body.clubName === 'string') {
      clubName = body.clubName.trim();
      if (clubName === '') clubName = null;
    }
    console.log(
      `[API /bulletin/access-requests POST] Parsed body, clubName: ${clubName}`
    );
  } catch (error) {
    if (error.name !== 'SyntaxError') {
      console.error(
        '[API /bulletin/access-requests POST] Error parsing request body:',
        error
      );
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 }
      );
    }
    console.log(
      '[API /bulletin/access-requests POST] No valid body or clubName provided.'
    );
  }

  try {
    console.log(
      `[API /bulletin/access-requests POST] Fetching membership for user: ${userId}`
    );
    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
      include: {
        floor: {
          select: { schoolId: true },
        },
      },
    });

    if (!membership?.floor?.schoolId) {
      console.warn(
        `[API /bulletin/access-requests POST] User ${userId} is not associated with a floor/school.`
      );
      return NextResponse.json(
        {
          error:
            'You must be a member of a floor within a school to request bulletin access.',
        },
        { status: 403 }
      );
    }
    const schoolId = membership.floor.schoolId;
    console.log(
      `[API /bulletin/access-requests POST] User ${userId} belongs to school: ${schoolId}`
    );

    console.log(
      `[API /bulletin/access-requests POST] Checking existing requests for user ${userId} in school ${schoolId}`
    );
    const existingRequest = await prisma.bulletinAccessRequest.findFirst({
      where: {
        userId: userId,
        schoolId: schoolId,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
      },
    });

    if (existingRequest) {
      console.log(
        `[API /bulletin/access-requests POST] User ${userId} already has a ${existingRequest.status} request for school ${schoolId}.`
      );
      const message =
        existingRequest.status === 'PENDING'
          ? 'You already have a pending request for bulletin access.'
          : 'Your request for bulletin access has already been approved.';
      return NextResponse.json({ error: message }, { status: 409 });
    }

    console.log(
      `[API /bulletin/access-requests POST] Creating new request for user ${userId}, school ${schoolId}, club: ${clubName}`
    );
    const newRequest = await prisma.bulletinAccessRequest.create({
      data: {
        userId: userId,
        schoolId: schoolId,
        clubName: clubName,
        status: 'PENDING',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    console.log(
      `[API /bulletin/access-requests POST] Successfully created request ID: ${newRequest.id}`
    );

    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error(
      `[API /bulletin/access-requests POST] Error processing request for user ${userId}:`,
      error
    );
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid user or school reference.' },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Failed to create bulletin access request.' },
      { status: 500 }
    );
  }
}
