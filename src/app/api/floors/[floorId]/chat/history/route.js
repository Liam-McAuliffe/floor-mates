import { NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import prisma from '@/lib/prisma';

const MESSAGES_PER_PAGE = 50;

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
    const floor = await prisma.floor.findUnique({
      where: { id: targetFloorId },
    });

    if (!floor) {
      return NextResponse.json({ error: 'Floor not found.' }, { status: 404 });
    }

    const membership = await prisma.floorMembership.findUnique({
      where: {
        userId_floorId: {
          userId: userId,
          floorId: targetFloorId,
        },
      },
      select: { floorId: true },
    });

    if (!membership) {
      console.warn(
        `[API Chat History] User ${userId} attempted to access history for floor ${targetFloorId} without membership.`
      );
      return NextResponse.json(
        { error: "Access denied to this floor's chat history." },
        { status: 403 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        floorId: targetFloorId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: MESSAGES_PER_PAGE,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const sortedMessages = messages.reverse();

    console.log(
      `[API Chat History] Fetched ${sortedMessages.length} messages for floor ${targetFloorId}`
    );
    return NextResponse.json(sortedMessages);
  } catch (error) {
    console.error(
      `[API Chat History] Error fetching history for floor ${targetFloorId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to fetch chat history: ${error.message}` },
      { status: 500 }
    );
  }
}
