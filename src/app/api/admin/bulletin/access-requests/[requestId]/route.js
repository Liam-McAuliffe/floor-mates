import { NextResponse } from 'next/server';
import { auth } from '../../../../../../../auth'; // Adjust path
import prisma from '@/lib/prisma'; // Adjust path
import { Prisma } from '@prisma/client';

/**
 * Handles PATCH requests to update the status of a specific bulletin access request.
 * Intended for Admins to approve or deny requests.
 * Creates a notification for the user upon approval or denial.
 */
export async function PATCH(request, { params }) {
  // 1. Authentication & Authorization Check
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    console.warn(
      '[API PATCH /admin/bulletin/access-requests/{id}] Unauthorized access attempt.'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const adminUserId = session.user.id;

  // 2. Get Request ID from Route Parameter
  const { requestId } = params;
  if (!requestId) {
    return NextResponse.json(
      { error: 'Request ID parameter is required.' },
      { status: 400 }
    );
  }
  console.log(
    `[API PATCH /admin/bulletin/access-requests/{id}] Admin ${adminUserId} attempting to update request ID: ${requestId}`
  );

  // 3. Input Validation (New Status)
  let newStatus;
  try {
    const body = await request.json();
    if (
      !body?.status ||
      typeof body.status !== 'string' ||
      !['APPROVED', 'DENIED'].includes(body.status.toUpperCase()) // Only allow setting to APPROVED or DENIED
    ) {
      throw new Error(
        'Invalid or missing status in request body. Must be "APPROVED" or "DENIED".'
      );
    }
    newStatus = body.status.toUpperCase();
    console.log(
      `[API PATCH /admin/bulletin/access-requests/{id}] Requested new status: ${newStatus}`
    );
  } catch (error) {
    console.error(
      `[API PATCH /admin/bulletin/access-requests/{id}] Error parsing body for request ${requestId}:`,
      error
    );
    return NextResponse.json(
      { error: `Invalid request body: ${error.message}` },
      { status: 400 }
    );
  }

  try {
    // 4. Update the Request in Database
    console.log(
      `[API PATCH /admin/bulletin/access-requests/{id}] Updating request ${requestId} status to ${newStatus}`
    );
    const updatedRequest = await prisma.bulletinAccessRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus, // Set the new status
        reviewedAt: new Date(), // Record the time of review
        reviewedByAdminId: adminUserId, // Record which admin reviewed it
      },
      // Include related info needed for notification or response
      include: {
        user: {
          select: { id: true, name: true, email: true }, // Need user.id for notification
        },
        school: {
          select: { id: true, name: true },
        },
        reviewedByAdmin: {
          select: { id: true, name: true },
        },
      },
    });

    console.log(
      `[API PATCH /admin/bulletin/access-requests/{id}] Successfully updated request ${requestId}.`
    );

    // --- 5. Create Notification for the User ---
    try {
      const targetUserId = updatedRequest.userId; // Get the ID of the user who made the request
      let notificationMessage = '';
      let notificationType;
      let notificationLink = '/bulletin'; // Link to bulletin board for convenience

      if (newStatus === 'APPROVED') {
        notificationMessage =
          'Your request to post on the bulletin board has been approved!';
        notificationType = 'BULLETIN_ACCESS_APPROVED';
      } else {
        // DENIED
        notificationMessage =
          'Your request to post on the bulletin board has been denied.';
        notificationType = 'BULLETIN_ACCESS_DENIED';
        notificationLink = '/profile'; // Link to profile where they might see the request status
      }

      console.log(
        `[API PATCH /admin/bulletin/access-requests/{id}] Creating notification for user ${targetUserId}: Type=${notificationType}`
      );

      await prisma.notification.create({
        data: {
          userId: targetUserId,
          message: notificationMessage,
          type: notificationType,
          link: notificationLink,
          relatedEntityId: updatedRequest.id, // Link notification to the request ID
          isRead: false, // Mark as unread initially
        },
      });
      console.log(
        `[API PATCH /admin/bulletin/access-requests/{id}] Notification created successfully for user ${targetUserId}.`
      );
    } catch (notificationError) {
      // Log the error but don't fail the whole request just because notification failed
      console.error(
        `[API PATCH /admin/bulletin/access-requests/{id}] Failed to create notification for request ${requestId} update:`,
        notificationError
      );
    }
    // --- End Notification Creation ---

    // 6. Return the Updated Request
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error(
      `[API PATCH /admin/bulletin/access-requests/{id}] Error updating request ${requestId}:`,
      error
    );
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      // Record not found
      return NextResponse.json(
        { error: 'Bulletin access request not found.' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update bulletin access request.' },
      { status: 500 }
    );
  }
}
