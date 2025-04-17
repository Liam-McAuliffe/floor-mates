import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { getToken } from 'next-auth/jwt';

export async function GET(request) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (token) {
    const session = await auth();
    if (session?.user?.id) {
      return NextResponse.json({ userId: session.user.id });
    }
  }

  return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
