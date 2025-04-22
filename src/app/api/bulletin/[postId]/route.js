import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function DELETE(request, { params }) {
  const session = await auth();
  const postId = params.postId;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json(
      { error: 'Not authenticated or role missing' },
      { status: 401 }
    );
  }
  const userId = session.user.id;
  const userRole = session.user.role;

  if (!postId) {
    return NextResponse.json(
      { error: 'Post ID parameter is required.' },
      { status: 400 }
    );
  }

  console.log(
    `[API Bulletin DELETE] User ${userId} (Role: ${userRole}) attempting to delete bulletin post ${postId}`
  );

  try {
    const postToDelete = await prisma.bulletinPost.findUnique({
      where: { id: postId },
      select: { schoolId: true, userId: true },
    });

    if (!postToDelete) {
      return NextResponse.json(
        { error: 'Bulletin post not found' },
        { status: 404 }
      );
    }

    const isAdmin = userRole === 'admin';
    let isAuthorized = isAdmin;

    if (!isAuthorized && userRole === 'RA') {
      const membership = await prisma.floorMembership.findFirst({
        where: { userId: userId },
        include: {
          floor: { select: { schoolId: true } },
        },
      });

      if (
        membership?.floor?.schoolId &&
        membership.floor.schoolId === postToDelete.schoolId
      ) {
        isAuthorized = true;
        console.log(
          `[API Bulletin DELETE] RA ${userId} is authorized (same school: ${postToDelete.schoolId})`
        );
      } else {
        console.warn(
          `[API Bulletin DELETE] RA ${userId} attempted delete in different school (User School: ${membership?.floor?.schoolId}, Post School: ${postToDelete.schoolId})`
        );
      }
    }

    if (!isAuthorized) {
      console.warn(
        `[API Bulletin DELETE] User ${userId} (Role: ${userRole}) is not authorized to delete post ${postId}.`
      );
      return NextResponse.json(
        { error: 'You are not authorized to delete this bulletin post.' },
        { status: 403 }
      );
    }

    await prisma.bulletinPost.delete({
      where: { id: postId },
    });

    console.log(
      `[API Bulletin DELETE] Bulletin post ${postId} deleted successfully by user ${userId}.`
    );
    return NextResponse.json(
      { message: 'Bulletin post deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[API Bulletin DELETE] Error deleting post ${postId} by user ${userId}:`,
      error
    );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Bulletin post not found during deletion attempt' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: `Failed to delete bulletin post: ${
          error.message || 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}
