import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  let body;
  try {
    body = await request.json();
    if (!body.code || typeof body.code !== 'string' || body.code.length !== 6) {
      throw new Error('A valid 6-character code is required.');
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }
  const { code } = body;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invitationCode = await tx.floorInvitationCode.findUnique({
        where: { code: code },
      });

      if (!invitationCode) {
        throw new Error('Invitation code not found.');
      }
      if (!invitationCode.isActive) {
        throw new Error('Invitation code is no longer active.');
      }
      if (
        invitationCode.expiresAt &&
        new Date() > new Date(invitationCode.expiresAt)
      ) {
        await tx.floorInvitationCode.update({
          where: { code: code },
          data: { isActive: false },
        });
        throw new Error('Invitation code has expired.');
      }

      const floorId = invitationCode.floorId;

      const existingMembership = await tx.floorMembership.findFirst({
        where: { userId: userId },
      });

      if (existingMembership) {
        if (existingMembership.floorId === floorId) {
          throw new Error('You are already a member of this floor.');
        } else {
          throw new Error(
            'You are already assigned to a different floor. Cannot join another.'
          );
        }
      }

      const newMembership = await tx.floorMembership.create({
        data: {
          userId: userId,
          floorId: floorId,
        },
      });

      if (invitationCode.isSingleUse) {
        await tx.floorInvitationCode.update({
          where: { code: code },
          data: { isActive: false },
        });
      }

      return {
        floorId: newMembership.floorId,
        message: 'Successfully joined floor.',
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (
      error.message.includes('Invitation code') ||
      error.message.includes('already a member') ||
      error.message.includes('already assigned')
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 }); // Bad request for logical errors
    }
    console.error('Error joining floor:', error);
    return NextResponse.json(
      { error: `Failed to join floor: ${error.message}` },
      { status: 500 }
    );
  }
}
