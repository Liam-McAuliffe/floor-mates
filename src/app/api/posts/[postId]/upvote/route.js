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
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { floorId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const membership = await prisma.floorMembership.findUnique({
      where: {
        userId_floorId: { userId: userId, floorId: post.floorId },
      },
      select: { userId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'Not authorized to upvote on this floor.' },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.postUpvote.create({
        data: {
          postId: postId,
          userId: userId,
        },
      });

      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          upvoteCount: { increment: 1 },
        },
        select: { upvoteCount: true },
      });

      return updatedPost;
    });

    console.log(
      `[API Upvote POST] User ${userId} upvoted post ${postId}. New count: ${result.upvoteCount}`
    );
    return NextResponse.json(
      { upvoteCount: result.upvoteCount },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Already upvoted' }, { status: 409 });
      }
      if (error.code === 'P2025') {
        return NextResponse.json(
          { error: 'Post not found during update' },
          { status: 404 }
        );
      }
    }
    console.error(
      `[API Upvote POST] Error upvoting post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to upvote post: ${error.message || 'Unknown error'}` },
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
      await tx.postUpvote.delete({
        where: {
          postId_userId: {
            postId: postId,
            userId: userId,
          },
        },
      });

      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          upvoteCount: { decrement: 1 },
        },
        select: { upvoteCount: true },
      });

      return updatedPost;
    });

    console.log(
      `[API Upvote DELETE] User ${userId} removed upvote for post ${postId}. New count: ${result.upvoteCount}`
    );
    return NextResponse.json(
      { upvoteCount: result.upvoteCount },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        const postExists = await prisma.post.findUnique({
          where: { id: postId },
          select: { id: true },
        });
        if (!postExists) {
          return NextResponse.json(
            { error: 'Post not found' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { error: 'Upvote not found' },
          { status: 404 }
        );
      }
    }
    console.error(
      `[API Upvote DELETE] Error removing upvote for post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to remove upvote: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
