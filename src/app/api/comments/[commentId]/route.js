import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function DELETE(request, { params: { commentId } }) {
  const session = await auth();

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
      { error: 'Comment ID is required' },
      { status: 400 }
    );
  }

  try {
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: {
        userId: true,
        postId: true,
        post: {
          select: { floorId: true },
        },
      },
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    if (!comment.post) {
      return NextResponse.json(
        { error: 'Associated post not found' },
        { status: 404 }
      );
    }

    const postFloorId = comment.post.floorId;

    const isCommentAuthor = comment.userId === userId;
    const isAdmin = userRole === 'admin';

    let isRAOnFloor = false;
    if (userRole === 'RA') {
      const membership = await prisma.floorMembership.findUnique({
        where: {
          userId_floorId: { userId: userId, floorId: postFloorId },
        },
        select: { userId: true },
      });
      isRAOnFloor = !!membership;
    }

    if (!isCommentAuthor && !isAdmin && !isRAOnFloor) {
      console.warn(
        `[API Comment DELETE] User ${userId} (role: ${userRole}) tried to delete comment ${commentId} on floor ${postFloorId}. Authorization failed.`
      );
      return NextResponse.json(
        { error: 'Not authorized to delete this comment' },
        { status: 403 }
      );
    }

    await prisma.postComment.delete({
      where: { id: commentId },
    });

    console.log(
      `[API Comment DELETE] Comment ${commentId} deleted by user ${userId} (role: ${userRole}, isAuthor: ${isCommentAuthor}, isAdmin: ${isAdmin}, isRAOnFloor: ${isRAOnFloor}).`
    );
    return NextResponse.json(
      { message: 'Comment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `[API Comment DELETE] Error deleting comment ${commentId} by user ${userId}:`,
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
      { error: `Failed to delete comment: ${error.message}` },
      { status: 500 }
    );
  }
}
