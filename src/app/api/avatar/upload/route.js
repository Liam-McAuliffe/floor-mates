// src/app/api/avatar/upload/route.js (Server-Side Upload Logic)
import { put } from '@vercel/blob'; // Use put from the main package server-side
import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth'; // Adjust path to root auth.js

export async function POST(request) {
  // 1. Check authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const userId = session.user.id;

  // 2. Get filename from query parameter
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');

  if (!filename) {
    return NextResponse.json(
      { error: 'Filename query parameter is required' },
      { status: 400 }
    );
  }

  // 3. Ensure request body exists (the file stream)
  if (!request.body) {
    return NextResponse.json(
      { error: 'No file body received' },
      { status: 400 }
    );
  }

  // 4. Upload the file stream using server-side `put`
  try {
    const blob = await put(
      `avatars/${userId}/${filename}`, // Desired pathname structure
      request.body, // The file data stream from the request body
      {
        access: 'public', // Make it publicly accessible
        addRandomSuffix: true, // Ensure unique filename (recommended)
        // cacheControlMaxAge: 60 * 60 * 24 * 365, // Optional: 1 year caching
      }
    );

    // 5. Return the successful blob details
    console.log('[API /avatar/upload] Server PUT successful:', blob);
    return NextResponse.json(blob);
  } catch (error) {
    console.error('[API /avatar/upload] Error calling server PUT:', error);
    return NextResponse.json(
      { error: `Failed to upload file: ${error.message || 'Unknown error'}` },
      { status: 500 } // Use 500 for server-side errors
    );
  }
}

// Note: The HEAD handler might not be necessary with this server upload approach
// export async function HEAD(request) { ... }
