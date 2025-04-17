import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const session = await auth();
  const targetFloorId = params.floorId;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!targetFloorId) {
    return NextResponse.json(
      { error: 'Floor ID parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const membership = await prisma.floorMembership.findUnique({
      where: { userId_floorId: { userId: userId, floorId: targetFloorId } },
      select: { floorId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Not authorized to view invite code for this floor.' },
        { status: 403 }
      );
    }

    const invitation = await prisma.floorInvitationCode.findFirst({
      where: {
        floorId: targetFloorId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'No active invitation code found for this floor.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ inviteCode: invitation.code });
  } catch (error) {
    console.error(
      `[API Invite Code] Error fetching code for floor ${targetFloorId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to fetch invite code: ${error.message}` },
      { status: 500 }
    );
  }
}
