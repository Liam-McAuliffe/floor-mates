import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  console.log(`[API Leave Floor] Attempting leave for user: ${userId}`);

  try {
    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
    });

    if (!membership) {
      console.log(`[API Leave Floor] User ${userId} not found in any floor.`);
      return NextResponse.json(
        { error: 'You are not currently a member of any floor.' },
        { status: 404 }
      );
    }

    const deletedMembership = await prisma.floorMembership.delete({
      where: {
        userId_floorId: {
          userId: userId,
          floorId: membership.floorId,
        },
      },
    });

    console.log(
      `[API Leave Floor] User ${userId} successfully left floor ${membership.floorId}.`
    );
    return NextResponse.json({ message: 'Successfully left the floor.' });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      console.log(
        `[API Leave Floor] Membership for user ${userId} not found for deletion (already left?).`
      );
      return NextResponse.json(
        { error: 'Floor membership not found.' },
        { status: 404 }
      );
    }
    console.error(`[API Leave Floor] Error for user ${userId}:`, error);
    return NextResponse.json(
      { error: `Failed to leave floor: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
