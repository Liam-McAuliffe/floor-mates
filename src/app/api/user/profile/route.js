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
    const body = await request.json();

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return NextResponse.json(
          { error: 'Display name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.major !== undefined) {
      if (typeof body.major !== 'string') {
        return NextResponse.json(
          { error: 'Major must be a string' },
          { status: 400 }
        );
      }
      updateData.major = body.major.trim();
    }

    // TODO: Add logic for 'image' URL later when implementing upload
    // if (body.image !== undefined) {
    //   // Add validation for URL if needed
    //   updateData.image = body.image;
    // }
  } catch (error) {
    console.error('API /api/user/profile PATCH: Invalid request body:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: 'No update data provided' },
      { status: 400 }
    );
  }

  try {
    console.log(
      `API Route: Updating profile for user ID: ${userId} with data:`,
      updateData
    );
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
    console.log('API Route: Profile update successful.');
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('API Route: Failed to update user profile in DB:', error);

    return NextResponse.json(
      { error: 'Failed to update profile in database' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        major: true,
        role: true,
        createdAt: true,
      },
    });
    if (!userProfile)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('API /api/user/profile GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
