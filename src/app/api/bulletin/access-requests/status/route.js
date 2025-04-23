import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth'; // Adjust path
import prisma from '@/lib/prisma'; // Adjust path

/**
 * Handles GET requests to check the current bulletin access request status
 * for the authenticated user within their school. Prioritizes APPROVED > PENDING > DENIED.
 */
export async function GET(request) {
  // 1. Authentication Check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  try {
    // 2. Get User's School ID
    const membership = await prisma.floorMembership.findFirst({
      where: { userId: userId },
      include: {
        floor: {
          select: { schoolId: true },
        },
      },
    });

    if (!membership?.floor?.schoolId) {
      console.log(
        `[API GET /bulletin/access-requests/status] User ${userId} not associated with a school. Returning null status.`
      );
      return NextResponse.json({ status: null, clubName: null });
    }
    const schoolId = membership.floor.schoolId;

    // 3. Find *all* relevant requests for the user and school
    const requests = await prisma.bulletinAccessRequest.findMany({
      where: {
        userId: userId,
        schoolId: schoolId,
        status: {
          in: ['APPROVED', 'PENDING', 'DENIED'],
        },
      },
      select: {
        status: true,
        clubName: true,
        requestedAt: true, // Needed for tie-breaking if logic gets complex
      },
      // Fetch latest first to simplify finding the most recent relevant status
      orderBy: {
        requestedAt: 'desc',
      },
    });

    if (requests.length === 0) {
      console.log(
        `[API GET /bulletin/access-requests/status] No existing request found for user ${userId} in school ${schoolId}.`
      );
      return NextResponse.json({ status: null, clubName: null }); // No request found
    }

    // 4. Determine the *most relevant* status (Priority: APPROVED > PENDING > DENIED)
    let finalStatus = null;
    let finalClubName = null;

    // Check for APPROVED first
    const approvedRequest = requests.find((req) => req.status === 'APPROVED');
    if (approvedRequest) {
      finalStatus = 'APPROVED';
      finalClubName = approvedRequest.clubName;
    } else {
      // If no APPROVED, check for PENDING
      const pendingRequest = requests.find((req) => req.status === 'PENDING');
      if (pendingRequest) {
        finalStatus = 'PENDING';
        finalClubName = pendingRequest.clubName;
      } else {
        // If only DENIED requests exist, report the status of the latest one
        finalStatus = requests[0].status; // Should be DENIED as it's the only one left
        finalClubName = requests[0].clubName;
      }
    }

    console.log(
      `[API GET /bulletin/access-requests/status] Determined status ${finalStatus} for user ${userId}.`
    );
    // 5. Return the determined status and club name
    return NextResponse.json({
      status: finalStatus,
      clubName: finalClubName,
    });
  } catch (error) {
    console.error(
      `[API GET /bulletin/access-requests/status] Error fetching status for user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch bulletin access request status.' },
      { status: 500 }
    );
  }
}
