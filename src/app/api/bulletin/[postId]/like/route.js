import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function POST(request, { params }) {
  const session = await auth();
  const postId = params.postId;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!postId) {
    return NextResponse.json(
      { error: 'Post ID parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const post = await prisma.bulletinPost.findUnique({
      where: { id: postId },
      select: { schoolId: true },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Bulletin post not found' },
        { status: 404 }
      );
    }

    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
      include: { floor: { select: { schoolId: true } } },
    });

    if (membership?.floor?.schoolId !== post.schoolId) {
      return NextResponse.json(
        { error: 'Cannot like posts outside your school' },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.bulletinLike.create({
        data: {
          bulletinPostId: postId,
          userId: userId,
        },
      });

      const updatedPost = await tx.bulletinPost.update({
        where: { id: postId },
        data: {
          likeCount: { increment: 1 },
        },
        select: { likeCount: true },
      });

      return updatedPost;
    });

    console.log(
      `[API Bulletin Like POST] User ${userId} liked post ${postId}. New count: ${result.likeCount}`
    );

    return NextResponse.json({
      likeCount: result.likeCount,
      currentUserHasLiked: true,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const currentPost = await prisma.bulletinPost.findUnique({
          where: { id: postId },
          select: { likeCount: true },
        });
        return NextResponse.json(
          {
            likeCount: currentPost?.likeCount ?? 0,
            currentUserHasLiked: true,
            error: 'Already liked',
          },
          { status: 409 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Bulletin post not found during update' },
          { status: 404 }
        );
      }
    }
    console.error(
      `[API Bulletin Like POST] Error liking post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to like post: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const session = await auth();
  const postId = params.postId;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!postId) {
    return NextResponse.json(
      { error: 'Post ID parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.bulletinLike.delete({
        where: {
          bulletinPostId_userId: {
            bulletinPostId: postId,
            userId: userId,
          },
        },
      });

      const updatedPost = await tx.bulletinPost.update({
        where: { id: postId },
        data: {
          likeCount: { decrement: 1 },
        },
        select: { likeCount: true },
      });

      if (updatedPost.likeCount < 0) {
        await tx.bulletinPost.update({
          where: { id: postId },
          data: { likeCount: 0 },
        });
        return { likeCount: 0 };
      }

      return updatedPost;
    });

    console.log(
      `[API Bulletin Like DELETE] User ${userId} unliked post ${postId}. New count: ${result.likeCount}`
    );

    return NextResponse.json({
      likeCount: result.likeCount,
      currentUserHasLiked: false,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        const postExists = await prisma.bulletinPost.findUnique({
          where: { id: postId },
          select: { id: true, likeCount: true },
        });
        if (!postExists) {
          return NextResponse.json(
            { error: 'Bulletin post not found' },
            { status: 404 }
          );
        }

        return NextResponse.json(
          {
            likeCount: postExists.likeCount,
            currentUserHasLiked: false,
            error: 'Like not found',
          },
          { status: 404 }
        );
      }
    }
    console.error(
      `[API Bulletin Like DELETE] Error unliking post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to unlike post: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
