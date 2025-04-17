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

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const isAuthor = post.userId === userId;
    const isAdmin = userRole === 'admin';

    let isRAOnFloor = false;
    if (userRole === 'RA') {
      const membership = await prisma.floorMembership.findUnique({
        where: {
          userId_floorId: {
            userId: userId,
            floorId: post.floorId,
          },
        },
        select: { userId: true },
      });
      isRAOnFloor = !!membership;
    }

    if (!isAuthor && !isAdmin && !isRAOnFloor) {
      console.warn(
        `[API Post DELETE] User ${userId} (role: ${userRole}) attempted to delete post ${postId} owned by ${post.userId}.`
      );
      return NextResponse.json(
        { error: 'You are not authorized to delete this post.' },
        { status: 403 }
      );
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    console.log(
      `[API Post DELETE] Post ${postId} deleted by user ${userId} (role: ${userRole}).`
    );

    return NextResponse.json(
      { message: 'Post deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    console.error(
      `[API Post DELETE] Error deleting post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to delete post: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

  let body;
  let updateData = {};
  try {
    body = await request.json();

    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim() === '') {
        throw new Error('Post content cannot be empty.');
      }
      updateData.content = body.content.trim();
    }

    if (body.title !== undefined) {
      if (
        body.title !== null &&
        (typeof body.title !== 'string' || body.title.trim() === '')
      ) {
        updateData.title = null;
      } else {
        updateData.title = body.title === null ? null : body.title.trim();
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields provided for update.');
    }
  } catch (error) {
    console.error('[API Posts PATCH] Invalid request body:', error.message);
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const isAuthor = post.userId === userId;
    if (!isAuthor) {
      console.warn(
        `[API Post PATCH] User ${userId} attempted to edit post ${postId} owned by ${post.userId}.`
      );
      return NextResponse.json(
        { error: 'You are not authorized to edit this post.' },
        { status: 403 }
      );
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    console.log(`[API Post PATCH] Post ${postId} updated by author ${userId}.`);

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    console.error(
      `[API Post PATCH] Error updating post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to update post: ${error.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
