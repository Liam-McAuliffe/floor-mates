import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import prisma from '@/lib/prisma';

const NOTIFICATIONS_LIMIT = 20;

export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    console.log('[API GET /notifications] User not authenticated.');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;
  console.log(
    `[API GET /notifications] Fetching notifications for user: ${userId}`
  );

  const { searchParams } = new URL(request.url);
  const readFilter = searchParams.get('isRead');

  let whereClause = {
    userId: userId,
  };
  if (readFilter === 'true') {
    whereClause.isRead = true;
    console.log(`[API GET /notifications] Filtering by isRead: true`);
  } else if (readFilter === 'false') {
    whereClause.isRead = false;
    console.log(`[API GET /notifications] Filtering by isRead: false`);
  }

  try {
    console.log(
      `[API GET /notifications] Fetching notifications with filter:`,
      whereClause
    );
    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      take: NOTIFICATIONS_LIMIT,
      select: {
        id: true,
        message: true,
        link: true,
        isRead: true,
        createdAt: true,
        type: true,
        relatedEntityId: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: userId,
        isRead: false,
      },
    });

    console.log(
      `[API GET /notifications] Found ${notifications.length} notifications (Limit: ${NOTIFICATIONS_LIMIT}), Unread count: ${unreadCount}.`
    );

    return NextResponse.json({
      notifications: notifications,
      unreadCount: unreadCount,
    });
  } catch (error) {
    console.error(
      `[API GET /notifications] Error fetching notifications for user ${userId}:`,
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch notifications.' },
      { status: 500 }
    );
  }
}
