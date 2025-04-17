import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const session = await auth();
  const requestedFloorId = params.floorId;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!requestedFloorId) {
    return NextResponse.json(
      { error: 'Floor ID is required.' },
      { status: 400 }
    );
  }

  try {
    const membership = await prisma.floorMembership.findUnique({
      where: {
        userId_floorId: {
          userId: userId,
          floorId: requestedFloorId,
        },
      },
      select: { floorId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied to this floor's details." },
        { status: 403 }
      );
    }

    const floor = await prisma.floor.findUnique({
      where: { id: requestedFloorId },
      select: {
        id: true,
        name: true,
        buildingName: true,
      },
    });

    if (!floor) {
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }

    return NextResponse.json(floor);
  } catch (error) {
    console.error(
      `Error fetching floor details for ${requestedFloorId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to fetch floor details: ${error.message}` },
      { status: 500 }
    );
  }
}
