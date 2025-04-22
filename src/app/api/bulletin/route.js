import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import prisma from '@/lib/prisma';

// --- UPDATED POST Handler ---
export async function POST(request) {
  const session = await auth();

  // 1. Authentication & Authorization Check (keep as is)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  const userRole = session.user.role;
  if (userRole !== 'admin' && userRole !== 'RA') {
    return NextResponse.json(
      { error: 'Only Admins and RAs can create bulletin posts.' },
      { status: 403 }
    );
  }

  // 2. Input Validation - Include new fields
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
      typeof body.schoolId !== 'string' ||
      !body.eventType ||
      typeof body.eventType !== 'string' // Add eventType check
    ) {
      throw new Error(
        'Missing required fields: title, content, schoolId, and eventType.'
      );
    }
    // Add validation for other new optional fields if needed (e.g., recurringDays format)
    if (body.eventDate !== undefined && body.eventDate !== null) {
      if (isNaN(Date.parse(body.eventDate))) {
        throw new Error('Invalid eventDate format.');
      }
    }
    // Basic check for recurringDays if provided
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

  // Destructure all potential fields from the body
  const {
    title,
    content,
    schoolId,
    eventType,
    eventDate,
    eventTime,
    location,
    recurringDays,
    flyerImageUrl, // Add new fields
  } = body;

  // 3. Check School Exists (keep as is)
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

  // 4. Database Operation - Update data payload
  try {
    const newBulletinPost = await prisma.bulletinPost.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        schoolId: schoolId,
        userId: userId,
        likeCount: 0,
        // --- ADD NEW FIELDS TO DATA ---
        eventType: eventType, // Should be 'EVENT' or 'RECURRING'
        eventDate:
          eventType === 'EVENT' && eventDate ? new Date(eventDate) : null, // Only save if type is EVENT
        eventTime: eventTime?.trim() || null,
        location: location?.trim() || null,
        recurringDays:
          eventType === 'RECURRING' && recurringDays ? recurringDays : [], // Only save if type is RECURRING
        flyerImageUrl: flyerImageUrl || null, // Save the URL if provided
        // --- END ADD NEW FIELDS ---
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    console.log(
      `[API Bulletin POST] User ${userId} created bulletin post ${newBulletinPost.id} for school ${schoolId}.`
    );
    return NextResponse.json(newBulletinPost, { status: 201 });
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

// --- CORRECTED GET Handler ---
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
      return NextResponse.json(
        { error: 'User is not associated with a school.' },
        { status: 400 }
      );
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
      likes: undefined,
      _count: undefined,
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
