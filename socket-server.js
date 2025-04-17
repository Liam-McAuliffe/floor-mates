require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
// const jwt = require('jsonwebtoken'); // jwt not explicitly used here, can remove if not needed elsewhere
const prisma = require('./src/lib/prisma').default; // Ensure this path is correct
const { Prisma } = require('@prisma/client'); // Import Prisma types for error handling

const PORT = process.env.SOCKET_PORT || 3001;
const NEXT_APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
// const JWT_SECRET = process.env.NEXTAUTH_SECRET; // No longer directly used here if only checking userId

// if (!JWT_SECRET) { // Keep if needed for other auth mechanisms
//   console.error('*** JWT_SECRET is not defined. ***');
// }

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: NEXT_APP_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

console.log(`Socket server allowing connections from: ${NEXT_APP_URL}`);

// --- Authentication Middleware ---
io.use(async (socket, next) => {
  const authData = socket.handshake.auth;
  const userId = authData?.userId;

  console.log(
    '[Socket Auth] Attempting auth with data:',
    JSON.stringify(authData)
  );

  if (!userId) {
    console.error('[Socket Auth] Failed: No userId provided.');
    return next(new Error('Authentication error: Missing userId.'));
  }

  try {
    console.log(`[Socket Auth] Looking up user: ${userId}`);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        memberships: { select: { floorId: true }, take: 1 },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found in database.`);
    }
    const floorId = user.memberships?.[0]?.floorId;
    if (!floorId) {
      console.warn(`[Socket Auth] User ${user.id} not assigned to a floor.`);
      return next(new Error('User is not assigned to a floor.'));
    }

    // Attach user data to the socket object
    socket.user = {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      image: user.image,
      role: user.role,
      floorId: floorId,
    };

    console.log(
      `[Socket Auth] User ${socket.user.id} (Role: ${socket.user.role}) on floor ${socket.user.floorId} authenticated.`
    );
    next();
  } catch (error) {
    console.error('[Socket Auth] Authentication failed:', error.message);
    next(new Error(`Authentication error: ${error.message}`));
  }
});

// --- Connection Handler ---
io.on('connection', (socket) => {
  console.log(
    `[Socket Connection] User connected: ${socket.user?.id} on floor ${socket.user?.floorId} (Socket ID: ${socket.id})`
  );

  // Join the user to their floor's room IF they have user data
  let floorRoom = null; // Initialize floorRoom for this connection scope
  if (socket.user?.floorId) {
    floorRoom = `floor-${socket.user.floorId}`; // Define floorRoom here
    socket.join(floorRoom);
    console.log(
      `[Socket Room] User ${socket.user.id} joined room: ${floorRoom}`
    );
  } else {
    console.warn(
      `[Socket Room] User ${socket.user?.id} connected but has no floorId to join a room.`
    );
    // Optionally disconnect if no floor ID: socket.disconnect();
  }

  // --- 'send_message' Handler ---
  socket.on('send_message', async (messageContent) => {
    // Basic check: Ensure user data and floorRoom are available
    if (!socket.user || !socket.user.id || !socket.user.floorId || !floorRoom) {
      console.error(
        `[Socket Send Message] Error: User ${socket.id} not fully setup (no user/floorId/room).`
      );
      socket.emit('message_error', {
        error: 'Cannot send message: user or room context missing.',
      });
      return;
    }
    const content = messageContent?.trim();
    if (!content) {
      socket.emit('message_error', { error: 'Cannot send an empty message.' });
      return;
    }

    console.log(
      `[Socket Send Message] Received from ${socket.user.id} for ${floorRoom}: "${content}"`
    );
    try {
      const message = await prisma.chatMessage.create({
        data: {
          content: content,
          floorId: socket.user.floorId,
          userId: socket.user.id,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      });
      console.log(
        `[DB Save] Message ${message.id} saved to floor ${socket.user.floorId}`
      );
      io.to(floorRoom).emit('receive_message', message);
      console.log(
        `[Socket Broadcast] Broadcasted message ID ${message.id} to room ${floorRoom}`
      );
    } catch (error) {
      console.error(
        '[Socket Send Message] Failed to save or broadcast message:',
        error
      );
      socket.emit('message_error', { error: 'Failed to send message.' });
    }
  });

  // --- 'delete_message' Handler ---
  socket.on('delete_message', async (messageId) => {
    // --- FIX: Define floorRoom within this handler's scope ---
    const currentFloorRoom = socket.user?.floorId
      ? `floor-${socket.user.floorId}`
      : null;
    // ---------------------------------------------------------

    if (!messageId || typeof messageId !== 'string') {
      socket.emit('message_error', { error: 'Invalid message ID.' });
      return;
    }

    // --- FIX: Use the locally defined currentFloorRoom ---
    if (
      !socket.user ||
      !socket.user.id ||
      !socket.user.role ||
      !currentFloorRoom
    ) {
      // -------------------------------------------------------
      console.error(
        `[Socket Delete] Error: User ${socket.id} not fully setup (no user/role/room).`
      );
      socket.emit('message_error', {
        error: 'Cannot delete message: context missing.',
      });
      return;
    }

    console.log(
      `[Socket Delete] User ${socket.user.id} requested deletion of message ${messageId}`
    );
    try {
      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        select: { userId: true, floorId: true },
      });
      if (!message) {
        socket.emit('message_error', { error: 'Message not found.' });
        return;
      }
      if (message.floorId !== socket.user.floorId) {
        socket.emit('message_error', {
          error: 'Cannot delete message from another floor.',
        });
        return;
      }

      const isAuthor = message.userId === socket.user.id;
      const isAdminOrRA =
        socket.user.role === 'admin' || socket.user.role === 'RA';
      if (!isAuthor && !isAdminOrRA) {
        socket.emit('message_error', { error: 'Not authorized to delete.' });
        return;
      }

      await prisma.chatMessage.delete({ where: { id: messageId } });
      console.log(
        `[DB Delete] Message ${messageId} deleted by User ${socket.user.id}`
      );

      // --- FIX: Use the locally defined currentFloorRoom ---
      io.to(currentFloorRoom).emit('message_deleted', { messageId: messageId });
      console.log(
        `[Socket Broadcast] Broadcasted deletion of ${messageId} to room ${currentFloorRoom}`
      );
      // -------------------------------------------------------
    } catch (error) {
      console.error(`[Socket Delete] Failed for message ${messageId}:`, error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        socket.emit('message_error', { error: 'Message already deleted.' });
      } else {
        socket.emit('message_error', { error: 'Failed to delete message.' });
      }
    }
  });

  // --- Other handlers ('disconnect', 'error') ---
  socket.on('disconnect', (reason) => {
    console.log(
      `[Socket Disconnect] User ${
        socket.user?.id || 'Unknown'
      } disconnected. Reason: ${reason}`
    );
  });
  socket.on('error', (error) => {
    console.error(
      `[Socket Error] User: ${socket.user?.id || 'Unknown'}. Error: ${
        error.message
      }`
    );
  });
});

// --- Server Listen & Shutdown ---
httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
process.on('SIGINT', () => {
  console.log('SIGINT received: closing servers...');
  io.close(() => {
    console.log('Socket.IO closed.');
    httpServer.close(() => {
      console.log('HTTP server closed.');
      prisma.$disconnect().then(() => {
        console.log('Prisma client disconnected.');
        process.exit(0);
      });
    });
  });
});
