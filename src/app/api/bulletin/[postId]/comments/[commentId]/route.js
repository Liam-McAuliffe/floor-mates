import { NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function DELETE(request, { params }) {
  const session = await auth();
  const commentId = params.commentId;

  if (!session?.user?.id || !session?.user?.role) {
    return NextResponse.json(
      { error: 'Not authenticated or role missing' },
      { status: 401 }
    );
  }
  const userId = session.user.id;
  const userRole = session.user.role;

  if (!commentId) {
    return NextResponse.json(
      { error: 'Comment ID parameter is required.' },
      { status: 400 }
    );
  }

  console.log(
    `[API Bulletin Comment DELETE] User ${userId} (Role: ${userRole}) attempting to delete comment ${commentId}`
  );

  try {
    const commentToDelete = await prisma.bulletinComment.findUnique({
      where: { id: commentId },
      select: {
        userId: true,
        bulletinPost: {
          select: {
            schoolId: true,
          },
        },
      },
    });

    if (!commentToDelete) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (!commentToDelete.bulletinPost) {
      console.error(
        `[API Bulletin Comment DELETE] Comment ${commentId} is orphaned (no associated bulletinPost).`
      );
      return NextResponse.json(
        { error: 'Associated bulletin post not found' },
        { status: 500 }
      );
    }

    const postSchoolId = commentToDelete.bulletinPost.schoolId;

    const isAdmin = userRole === 'admin';
    const isAuthor = commentToDelete.userId === userId;
    let isRAOnCorrectSchool = false;
    let isAuthorized = isAdmin || isAuthor;

    if (!isAuthorized && userRole === 'RA') {
      const membership = await prisma.floorMembership.findFirst({
        where: { userId: userId },
        include: {
          floor: { select: { schoolId: true } },
        },
      });

      if (
        membership?.floor?.schoolId &&
        membership.floor.schoolId === postSchoolId
      ) {
        isRAOnCorrectSchool = true;
        isAuthorized = true;
        console.log(
          `[API Bulletin Comment DELETE] RA ${userId} is authorized (same school: ${postSchoolId})`
        );
      } else {
        console.warn(
          `[API Bulletin Comment DELETE] RA ${userId} attempted delete in different school (User School: ${membership?.floor?.schoolId}, Post School: ${postSchoolId})`
        );
      }
    }

    if (!isAuthorized) {
      console.warn(
        `[API Bulletin Comment DELETE] User ${userId} (Role: ${userRole}, Author: ${isAuthor}, RA on School: ${isRAOnCorrectSchool}) is not authorized to delete comment ${commentId}.`
      );
      return NextResponse.json(
        { error: 'You are not authorized to delete this comment.' },
        { status: 403 }
      );
    }

    await prisma.bulletinComment.delete({
      where: { id: commentId },
    });

    console.log(
      `[API Bulletin Comment DELETE] Comment ${commentId} deleted successfully by user ${userId}.`
    );
    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[API Bulletin Comment DELETE] Error deleting comment ${commentId} by user ${userId}:`,
      error
    );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Comment not found during deletion attempt' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: `Failed to delete comment: ${error.message || 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
