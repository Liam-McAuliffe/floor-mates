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
    const isAuthor = postToDelete.userId === userId;
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
        membership.floor.schoolId === postToDelete.schoolId
      ) {
        isRAOnCorrectSchool = true;
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

export async function PATCH(request, { params }) {
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
    `[API Bulletin PATCH] User ${userId} (Role: ${userRole}) attempting to update post ${postId}`
  );

  let body;
  let updateData = {};
  try {
    body = await request.json();

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim() === '') {
        throw new Error('Title cannot be empty.');
      }
      updateData.title = body.title.trim();
    }
    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || body.content.trim() === '') {
        throw new Error('Content cannot be empty.');
      }
      updateData.content = body.content.trim();
    }

    if (body.eventType !== undefined) {
      if (!['EVENT', 'RECURRING'].includes(body.eventType)) {
        throw new Error('Invalid eventType.');
      }
      updateData.eventType = body.eventType;
    }
    if (body.location !== undefined) {
      updateData.location =
        body.location === null ? null : String(body.location).trim();
    }
    if (body.eventTime !== undefined) {
      updateData.eventTime =
        body.eventTime === null ? null : String(body.eventTime).trim();
    }

    if (body.eventDate !== undefined) {
      if (body.eventDate === null) {
        updateData.eventDate = null;
      } else {
        const parsedDate = new Date(body.eventDate);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid eventDate format.');
        }
        updateData.eventDate =
          (updateData.eventType || body.eventType) === 'EVENT'
            ? parsedDate.toISOString()
            : null;
      }
    } else if (updateData.eventType === 'RECURRING') {
      updateData.eventDate = null;
    }

    if (body.recurringDays !== undefined) {
      if (!Array.isArray(body.recurringDays)) {
        throw new Error('recurringDays must be an array.');
      }
      updateData.recurringDays =
        (updateData.eventType || body.eventType) === 'RECURRING'
          ? body.recurringDays
          : [];
    } else if (updateData.eventType === 'EVENT') {
      updateData.recurringDays = [];
    }

    if (body.flyerImageUrl !== undefined) {
      if (
        body.flyerImageUrl === null ||
        (typeof body.flyerImageUrl === 'string' &&
          body.flyerImageUrl.startsWith('https://'))
      ) {
        updateData.flyerImageUrl = body.flyerImageUrl;
      } else if (body.flyerImageUrl !== '') {
        throw new Error(
          'Invalid flyerImageUrl format. Must be null or a valid https URL.'
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields provided for update.' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    const postToUpdate = await prisma.bulletinPost.findUnique({
      where: { id: postId },
      select: { userId: true, schoolId: true },
    });

    if (!postToUpdate) {
      return NextResponse.json(
        { error: 'Bulletin post not found' },
        { status: 404 }
      );
    }

    const isAdmin = userRole === 'admin';
    const isAuthor = postToUpdate.userId === userId;
    let isRAOnCorrectSchool = false;
    let isAuthorized = isAdmin || isAuthor;

    if (!isAuthorized && userRole === 'RA') {
      const membership = await prisma.floorMembership.findFirst({
        where: { userId: userId },
        include: { floor: { select: { schoolId: true } } },
      });
      if (membership?.floor?.schoolId === postToUpdate.schoolId) {
        isRAOnCorrectSchool = true;
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      console.warn(
        `[API Bulletin PATCH] User ${userId} (Role: ${userRole}, Author: ${isAuthor}, RA on School: ${isRAOnCorrectSchool}) is not authorized to update post ${postId}.`
      );
      return NextResponse.json(
        { error: 'You are not authorized to edit this post.' },
        { status: 403 }
      );
    }

    const updatedPost = await prisma.bulletinPost.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: {
          select: { comments: true },
        },
      },
    });

    const like = await prisma.bulletinLike.findUnique({
      where: {
        bulletinPostId_userId: {
          bulletinPostId: postId,
          userId: userId,
        },
      },
      select: { userId: true },
    });

    const responsePost = {
      ...updatedPost,
      currentUserHasLiked: !!like,
      commentCount: updatedPost._count.comments,
      _count: undefined,
    };

    console.log(
      `[API Bulletin PATCH] Post ${postId} updated successfully by user ${userId}.`
    );
    return NextResponse.json(responsePost, { status: 200 });
  } catch (error) {
    console.error(
      `[API Bulletin PATCH] Error updating post ${postId} by user ${userId}:`,
      error
    );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Bulletin post not found during update attempt' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      {
        error: `Failed to update bulletin post: ${
          error.message || 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}
