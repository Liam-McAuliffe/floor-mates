import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';

const POSTS_PER_PAGE = 20;

export async function GET(request, { params }) {
  const session = await auth();
  const targetFloorId = params.floorId;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!targetFloorId) {
    return NextResponse.json(
      { error: 'Floor ID parameter is required.' },
      { status: 400 }
    );
  }

  try {
    const membership = await prisma.floorMembership.findUnique({
      where: {
        userId_floorId: {
          userId: userId,
          floorId: targetFloorId,
        },
      },
      select: { floorId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied to this floor's posts." },
        { status: 403 }
      );
    }

    const posts = await prisma.post.findMany({
      where: {
        floorId: targetFloorId,
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: POSTS_PER_PAGE,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch posts: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  const session = await auth();
  const targetFloorId = params.floorId;

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!targetFloorId) {
    return NextResponse.json(
      { error: 'Floor ID parameter is required.' },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await request.json();
    if (
      !body.content ||
      typeof body.content !== 'string' ||
      body.content.trim() === ''
    ) {
      throw new Error('Post content is required.');
    }
    if (body.title !== undefined && typeof body.title !== 'string') {
      throw new Error('Post title must be a string if provided.');
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }

  const { title, content } = body;

  try {
    const membership = await prisma.floorMembership.findUnique({
      where: {
        userId_floorId: {
          userId: userId,
          floorId: targetFloorId,
        },
      },
      select: { userId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of this floor to post.' },
        { status: 403 }
      );
    }

    const newPost = await prisma.post.create({
      data: {
        title: title ? title.trim() : null,
        content: content.trim(),
        floorId: targetFloorId,
        userId: userId,
        isPinned: false,
        upvoteCount: 0,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    return NextResponse.json(newPost, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to create post: ${error.message}` },
      { status: 500 }
    );
  }
}
