import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { Prisma } from '@prisma/client';

export async function POST(request) {
  const session = await auth();

  console.log('--- SERVER-SIDE SESSION ---');
  console.log(
    '[API /admin/floors] Received session:',
    JSON.stringify(session, null, 2)
  );
  console.log('-------------------------');

  if (!session?.user?.id || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const adminUserId = session.user.id;

  let body;

  try {
    body = await request.json();
    if (!body.name || !body.buildingName) {
      return NextResponse.json(
        { error: 'Missing required fields: name and buildingName' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      { error: 'Invalid request body', message: error.message },
      { status: 400 }
    );
  }

  const {
    name,
    buildingName,
    isCodeSingleUse = false,
    codeExpiresInDays = null,
  } = body;

  let uniqueCode = '';
  let attepts = 0;
  const maxAttepts = 5;
  while (!uniqueCode && attepts < maxAttepts) {
    const potentialCode = nanoid(6);
    const existing = await prisma.floorInvitationCode.findUnique({
      where: { code: potentialCode },
    });
    if (!existing) {
      uniqueCode = potentialCode;
    }
    attepts++;
  }

  if (!uniqueCode) {
    return NextResponse.json(
      {
        error:
          'Failed to generate a unique invitation code after multiple attempts.',
      },
      { status: 500 }
    );
  }
  let expiresAt = null;
  if (
    codeExpiresInDays &&
    typeof codeExpiresInDays === 'number' &&
    codeExpiresInDays > 0
  ) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + codeExpiresInDays);
  }

  try {
    const newFloor = await prisma.$transaction(async (tx) => {
      const floor = await tx.floor.create({
        data: {
          name: name,
          buildingName: buildingName,
        },
      });
      await tx.floorInvitationCode.create({
        data: {
          code: uniqueCode,
          floorId: floor.id,
          createdBy: adminUserId,
          isSingleUse: isCodeSingleUse,
          expiresAt: expiresAt,
          isActive: true,
        },
      });
      return floor;
    });

    const responsePayload = {
      ...newFloor,
      invitationCode: uniqueCode,
      codeIsSingleUse: isCodeSingleUse,
      codeExpiresAt: expiresAt?.toISOString() ?? null,
    };
    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      console.warn(
        `[API /admin/floors] Unique constraint violation: Floor '${name}' in building '${buildingName}' already exists.`
      );
      return NextResponse.json(
        {
          error: `A floor named "${name}" already exists in building "${buildingName}".`,
        },
        { status: 409 }
      ); // 409 Conflict
    }

    console.error('Error creating floor/invitation code:', error);
    return NextResponse.json(
      { error: `Database error: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
