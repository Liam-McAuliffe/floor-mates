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
      console.warn(
        `[API GET /floors/${requestedFloorId}] User ${userId} denied access (not a member).`
      );
      return NextResponse.json(
        { error: "Access denied to this floor's details." },
        { status: 403 }
      );
    }

    console.log(
      `[API GET /floors/${requestedFloorId}] User ${userId} authorized. Fetching details...`
    );
    const floor = await prisma.floor.findUnique({
      where: { id: requestedFloorId },
      select: {
        id: true,
        name: true,
        buildingName: true,
      },
    });

    if (!floor) {
      console.error(
        `[API GET /floors/${requestedFloorId}] Floor not found in database.`
      );
      return NextResponse.json({ error: 'Floor not found' }, { status: 404 });
    }

    console.log(
      `[API GET /floors/${requestedFloorId}] Returning floor details.`
    );
    return NextResponse.json(floor);
  } catch (error) {
    console.error(
      `[API GET /floors/${requestedFloorId}] Error fetching floor details:`,
      error
    );
    const errorMessage =
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error.';
    return NextResponse.json(
      { error: `Failed to fetch floor details: ${errorMessage}` },
      { status: 500 }
    );
  }
}
