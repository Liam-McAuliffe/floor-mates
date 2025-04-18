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

    const now = new Date();

    const posts = await prisma.post.findMany({
      where: {
        floorId: targetFloorId,
        OR: [{ expiresAt: { gt: now } }, { isPinned: true }],
      },
      orderBy: [
        { isPinned: 'desc' },
        { upvoteCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: POSTS_PER_PAGE,
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
        upvotes: {
          where: { userId: userId },
          select: { userId: true },
        },
      },
    });

    const postsWithUpvoteStatus = posts.map((post) => ({
      ...post,
      currentUserHasUpvoted: post.upvotes.length > 0,
      upvotes: undefined,
    }));

    return NextResponse.json(postsWithUpvoteStatus);
  } catch (error) {
    console.error(
      `[API Posts GET] Error fetching posts for floor ${targetFloorId}:`,
      error
    );
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

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const newPost = await prisma.post.create({
      data: {
        title: title ? title.trim() : null,
        content: content.trim(),
        floorId: targetFloorId,
        userId: userId,
        isPinned: false,
        upvoteCount: 0,
        expiresAt: expiresAt,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const responsePost = {
      ...newPost,
      currentUserHasUpvoted: false,
      upvotes: undefined,
    };

    return NextResponse.json(responsePost, { status: 201 });
  } catch (error) {
    console.error(
      `[API Posts POST] Error creating post for floor ${targetFloorId}:`,
      error
    );
    console.error(error);
    return NextResponse.json(
      { error: `Failed to create post: ${error.message}` },
      { status: 500 }
    );
  }
}
