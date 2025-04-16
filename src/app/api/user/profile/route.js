import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';

export async function PATCH(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  let updateData = {};
  try {
    const requestBody = await request.json();

    if (requestBody.name !== undefined) {
      updateData.name = requestBody.name.trim();
    }
    if (requestBody.major !== undefined) {
      updateData.major = requestBody.major.trim();
    }
    if (requestBody.image !== undefined) {
      if (
        typeof requestBody.image === 'string' &&
        requestBody.image.startsWith('https://')
      ) {
        updateData.image = requestBody.image;
      } else if (requestBody.image === null) {
        updateData.image = null;
      }
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No valid fields to update' },
      { status: 400 }
    );
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        major: true,
        role: true,
      },
    });
    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to update profile: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        major: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch profile: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  console.log(
    `[API DELETE /user/profile] Attempting deletion for user: ${userId}`
  );
  try {
    const deletedUser = await prisma.user.delete({
      where: { id: userId },
    });
    console.log(
      `[API DELETE /user/profile] User deleted successfully: ${deletedUser.id}`
    );
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(`[API DELETE /user/profile] Error deleting user: ${error}`);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'User not found to delete' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: `Failed to delete profile: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
