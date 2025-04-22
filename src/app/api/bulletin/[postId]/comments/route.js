import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';

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
      console.warn(
        `[API Bulletin Comment POST] User ${userId} tried to comment on post ${postId} from another school (User School: ${membership?.floor?.schoolId}, Post School: ${post.schoolId})`
      );
      return NextResponse.json(
        { error: 'Cannot comment on posts outside your school' },
        { status: 403 }
      );
    }

    const newComment = await prisma.bulletinComment.create({
      data: {
        content: content.trim(),
        bulletinPostId: postId,
        userId: userId,
      },
      include: {
        user: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    console.log(
      `[API Bulletin Comment POST] User ${userId} added comment ${newComment.id} to post ${postId}.`
    );
    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error(
      `[API Bulletin Comment POST] Error creating comment for post ${postId} by user ${userId}:`,
      error
    );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return NextResponse.json(
        { error: 'Bulletin post not found or already deleted.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to create comment: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(request, context) { // Use 'context' instead of destructuring { params } directly
  const session = await auth();
  // --- MODIFICATION: Access postId from context.params ---
  const postId = context.params.postId;
  // --- END MODIFICATION ---

  // 1. Authentication Check
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  if (!postId) { // Check if postId was successfully extracted
    console.error("[API Bulletin Comment GET] Failed to extract postId from route parameters.");
    return NextResponse.json(
      { error: 'Post ID parameter is required or missing from route context.' },
      { status: 400 }
    );
  }
  // ... (Rest of the GET handler remains the same - fetching comments, etc.) ...
    try {
        // 2. Authorization: Verify user belongs to the same school as the post
        const post = await prisma.bulletinPost.findUnique({
            where: { id: postId },
            select: { schoolId: true }
        });

        if (!post) {
            return NextResponse.json({ error: 'Bulletin post not found' }, { status: 404 });
        }

        const membership = await prisma.floorMembership.findFirst({
            where: { userId: userId },
            include: { floor: { select: { schoolId: true } } }
        });

        if (membership?.floor?.schoolId !== post.schoolId) {
            console.warn(`[API Bulletin Comment GET] User ${userId} tried to get comments for post ${postId} from another school (User School: ${membership?.floor?.schoolId}, Post School: ${post.schoolId})`);
            return NextResponse.json({ error: 'Cannot view comments for posts outside your school' }, { status: 403 });
        }

        // 3. Fetch Comments
        const comments = await prisma.bulletinComment.findMany({
          where: { bulletinPostId: postId },
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
          `[API Bulletin Comment GET] Error fetching comments for post ${postId} by user ${userId}:`,
          error
        );
        return NextResponse.json(
          { error: `Failed to fetch comments: ${error.message}` },
          { status: 500 }
        );
      }
}