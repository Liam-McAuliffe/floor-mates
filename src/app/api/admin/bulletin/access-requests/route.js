import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    console.warn(
      '[API GET /admin/bulletin/access-requests] Unauthorized access attempt.'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const adminUserId = session.user.id;
  console.log(
    `[API GET /admin/bulletin/access-requests] Admin ${adminUserId} accessing.`
  );

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status')?.toUpperCase();

  let whereClause = {};

  if (
    statusFilter &&
    ['PENDING', 'APPROVED', 'DENIED'].includes(statusFilter)
  ) {
    whereClause.status = statusFilter;
    console.log(
      `[API GET /admin/bulletin/access-requests] Filtering by status: ${statusFilter}`
    );
  } else if (statusFilter) {
    console.warn(
      `[API GET /admin/bulletin/access-requests] Invalid status filter ignored: ${statusFilter}`
    );
  }

  try {
    console.log(
      `[API GET /admin/bulletin/access-requests] Fetching requests with filter:`,
      whereClause
    );
    const requests = await prisma.bulletinAccessRequest.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
        school: {
          select: { id: true, name: true },
        },
        reviewedByAdmin: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ status: 'asc' }, { requestedAt: 'asc' }],
    });

    console.log(
      `[API GET /admin/bulletin/access-requests] Found ${requests.length} requests.`
    );
    return NextResponse.json(requests);
  } catch (error) {
    console.error(
      '[API GET /admin/bulletin/access-requests] Error fetching requests:',
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch bulletin access requests.' },
      { status: 500 }
    );
  }
}
