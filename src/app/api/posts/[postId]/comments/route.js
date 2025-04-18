import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params: { postId } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
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
        { error: 'Not authorized to view comments on this floor.' },
        { status: 403 }
      );
    }

    const comments = await prisma.postComment.findMany({
      where: { postId: postId },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error(
      `[API Comments GET] Error fetching comments for post ${postId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to fetch comments: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request, { params: { postId } }) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!postId) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
    if (
      !body.content ||
      typeof body.content !== 'string' ||
      body.content.trim() === ''
    ) {
      throw new Error('Comment content cannot be empty.');
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }
  const { content } = body;

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
        { error: 'Not authorized to comment on this floor.' },
        { status: 403 }
      );
    }

    const newComment = await prisma.postComment.create({
      data: {
        content: content.trim(),
        postId: postId,
        userId: userId,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error(
      `[API Comments POST] Error creating comment for post ${postId} by user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to create comment: ${error.message}` },
      { status: 500 }
    );
  }
}
