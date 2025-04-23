import { NextResponse } from 'next/server';
import { auth } from '../../../../auth'; // Adjust path
import prisma from '@/lib/prisma'; // Adjust path
import { Prisma } from '@prisma/client'; // Import Prisma types

// --- GET Handler remains the same ---
export async function GET(request) {
  const session = await auth();

  // 1. Authentication
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // 2. Determine User's School ID
    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
      include: {
        floor: { select: { schoolId: true } },
      },
    });

    if (!membership?.floor?.schoolId) {
      console.warn(
        `[API Bulletin GET] User ${userId} is not associated with a floor/school.`
      );
      // Return empty array if user has no school, they can't see any posts
      return NextResponse.json([]);
      // Or return an error:
      // return NextResponse.json({ error: 'User is not associated with a school.' }, { status: 400 });
    }
    const userSchoolId = membership.floor.schoolId;

    console.log(
      `[API Bulletin GET] Fetching posts for user ${userId} in school ${userSchoolId}`
    );

    // 3. Fetch Bulletin Posts for the User's School
    const posts = await prisma.bulletinPost.findMany({
      where: {
        schoolId: userSchoolId,
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, image: true } },
        likes: {
          where: { userId: userId },
          select: { userId: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    // 4. Format Response
    const formattedPosts = posts.map((post) => ({
      ...post,
      currentUserHasLiked: post.likes.length > 0,
      commentCount: post._count.comments,
      likes: undefined, // Remove sensitive/unnecessary data
      _count: undefined, // Remove count object
    }));

    return NextResponse.json(formattedPosts);
  } catch (error) {
    console.error(
      `[API Bulletin GET] Error fetching bulletin posts for user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch bulletin posts' },
      { status: 500 }
    );
  }
}

// --- UPDATED POST Handler ---
export async function POST(request) {
  const session = await auth();

  // 1. Authentication Check
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  const userRole = session.user.role; // Get user role from session

  // 2. Input Validation (keep as is)
  let body;
  try {
    body = await request.json();
    if (
      !body.title ||
      typeof body.title !== 'string' ||
      body.title.trim() === '' ||
      !body.content ||
      typeof body.content !== 'string' ||
      body.content.trim() === '' ||
      !body.schoolId ||
      typeof body.schoolId !== 'string' || // School ID must be provided in body
      !body.eventType ||
      typeof body.eventType !== 'string'
    ) {
      throw new Error(
        'Missing required fields: title, content, schoolId, and eventType.'
      );
    }
    if (body.eventDate !== undefined && body.eventDate !== null) {
      if (isNaN(Date.parse(body.eventDate))) {
        throw new Error('Invalid eventDate format.');
      }
    }
    if (
      body.recurringDays !== undefined &&
      !Array.isArray(body.recurringDays)
    ) {
      throw new Error('recurringDays must be an array.');
    }
  } catch (error) {
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }

  const {
    title,
    content,
    schoolId,
    eventType,
    eventDate,
    eventTime,
    location,
    recurringDays,
    flyerImageUrl,
  } = body;

  // 3. Authorization Check (MODIFIED)
  let isAuthorized = false;
  if (userRole === 'admin' || userRole === 'RA') {
    // Admins and RAs are authorized by default (RA check might need refinement based on school later if needed)
    isAuthorized = true;
    console.log(
      `[API Bulletin POST] User ${userId} authorized via role: ${userRole}`
    );
  } else {
    // If not Admin/RA, check for an approved access request for the *target* school
    console.log(
      `[API Bulletin POST] User ${userId} (role: ${userRole}) checking access request for school ${schoolId}`
    );
    try {
      const accessRequest = await prisma.bulletinAccessRequest.findFirst({
        where: {
          userId: userId,
          schoolId: schoolId, // Check against the school ID the post is intended for
          status: 'APPROVED',
        },
        select: { id: true }, // Only need to know if it exists
      });
      if (accessRequest) {
        isAuthorized = true;
        console.log(
          `[API Bulletin POST] User ${userId} authorized via approved request ${accessRequest.id}`
        );
      } else {
        console.log(
          `[API Bulletin POST] User ${userId} has no approved request for school ${schoolId}`
        );
      }
    } catch (authError) {
      console.error(
        `[API Bulletin POST] Error checking access request for user ${userId}:`,
        authError
      );
      // Treat DB error during auth check as unauthorized for safety
      isAuthorized = false;
    }
  }

  // If not authorized after checks, deny access
  if (!isAuthorized) {
    console.warn(
      `[API Bulletin POST] User ${userId} is not authorized to post to school ${schoolId}.`
    );
    return NextResponse.json(
      {
        error:
          'You do not have permission to create bulletin posts for this school.',
      },
      { status: 403 } // Forbidden
    );
  }

  // 4. Check School Exists (keep as is)
  try {
    const schoolExists = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true },
    });
    if (!schoolExists) {
      return NextResponse.json(
        { error: `School with ID ${schoolId} not found.` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(
      `[API Bulletin POST] Error checking school existence for ID ${schoolId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Database error checking school existence.' },
      { status: 500 }
    );
  }

  // 5. Database Operation (keep as is)
  try {
    const newBulletinPost = await prisma.bulletinPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        schoolId: schoolId,
        userId: userId,
        likeCount: 0,
        eventType: eventType,
        eventDate:
          eventType === 'EVENT' && eventDate ? new Date(eventDate) : null,
        eventTime: eventTime?.trim() || null,
        location: location?.trim() || null,
        recurringDays:
          eventType === 'RECURRING' && recurringDays ? recurringDays : [],
        flyerImageUrl: flyerImageUrl || null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        // Include counts/likes status for consistency if needed by frontend immediately
        _count: {
          select: { comments: true },
        },
      },
    });

    // Format response similar to GET
    const formattedPost = {
      ...newBulletinPost,
      currentUserHasLiked: false, // New post hasn't been liked by creator yet
      commentCount: newBulletinPost._count.comments,
      _count: undefined,
    };

    console.log(
      `[API Bulletin POST] User ${userId} created bulletin post ${formattedPost.id} for school ${schoolId}.`
    );
    return NextResponse.json(formattedPost, { status: 201 }); // Return formatted post
  } catch (error) {
    console.error(
      `[API Bulletin POST] Error creating bulletin post for user ${userId} and school ${schoolId}:`,
      error
    );
    return NextResponse.json(
      { error: `Failed to create bulletin post: ${error.message}` },
      { status: 500 }
    );
  }
}
