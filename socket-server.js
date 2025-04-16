require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const prisma = require('./src/lib/prisma').default;

const PORT = process.env.SOCKET_PORT || 3001;
const NEXT_APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  console.error(
    '*** JWT_SECRET is not defined in .env file. Authentication will fail. ***'
  );
}

const httpServer = http.createServer();

const io = new Server(httpServer, {
  cors: {
    origin: NEXT_APP_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

console.log(`Socket server allowing connections from: ${NEXT_APP_URL}`);

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  console.log(
    '[Socket Auth] Attempting auth with token:',
    token ? 'Token Present' : 'No Token'
  );

  if (!token || !JWT_SECRET) {
    console.error('[Socket Auth] Failed: No token or JWT_SECRET missing.');
    return next(
      new Error('Authentication error: Token missing or server misconfigured.')
    );
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub || decoded.id;
    if (!userId) {
      throw new Error('User ID (`sub` or `id`) not found in token payload.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        floorMemberships: {
          select: { floorId: true },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error(`User ${userId} not found in database.`);
    }

    const floorId = user.floorMemberships?.[0]?.floorId;

    if (!floorId) {
      console.warn(
        `[Socket Auth] User ${user.id} is not assigned to a floor. Disconnecting.`
      );
      throw new Error('User is not assigned to a floor.');
    }

    socket.user = {
      id: user.id,
      name: user.name || user.email,
      email: user.email,
      image: user.image,
      floorId: floorId,
    };

    console.log(
      `[Socket Auth] User ${socket.user.id} on floor ${socket.user.floorId} authenticated.`
    );
    next();
  } catch (error) {
    console.error('[Socket Auth] Authentication failed:', error.message);
    next(new Error(`Authentication error: ${error.message}`));
  }
});

io.on('connection', (socket) => {
  console.log(
    `[Socket Connection] User connected: ${socket.user?.id} on floor ${socket.user?.floorId} (Socket ID: ${socket.id})`
  );
  if (socket.user?.floorId) {
    const floorRoom = `floor-${socket.user.floorId}`;
    socket.join(floorRoom);
    console.log(
      `[Socket Room] User ${socket.user.id} automatically joined room: ${floorRoom}`
    );
  } else {
    console.warn(
      `[Socket Room] User ${socket.user?.id} connected but has no floorId to join a room.`
    );
  }

  socket.on('send_message', async (messageContent) => {
    if (!socket.user || !socket.user.id || !socket.user.floorId) {
      console.error(
        `[Socket Send Message] Error: User ${socket.id} not fully authenticated or missing floorId.`
      );
      socket.emit('message_error', {
        error: 'Authentication issue, cannot send message.',
      });
      return;
    }

    const content = messageContent?.trim();
    const floorId = socket.user.floorId;
    const floorRoom = `floor-${floorId}`;

    if (!content) {
      console.log(
        `[Socket Send Message] User ${socket.user.id} sent empty message.`
      );
      socket.emit('message_error', { error: 'Cannot send an empty message.' });
      return;
    }

    console.log(
      `[Socket Send Message] Received from ${socket.user.id} for floor ${floorId}: "${content}"`
    );

    try {
      const message = await prisma.chatMessage.create({
        data: {
          content: content,
          floorId: floorId,
          userId: socket.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      });
      console.log(
        `[DB Save] Message from ${socket.user.id} saved to floor ${floorId} (ID: ${message.id})`
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
      socket.emit('message_error', {
        error: 'Failed to send message. Please try again.',
      });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(
      `[Socket Disconnect] User disconnected: ${
        socket.user?.id || 'Unknown'
      } (Socket ID: ${socket.id}). Reason: ${reason}`
    );
  });

  socket.on('error', (error) => {
    console.error(
      `[Socket Error] User: ${socket.user?.id || 'Unknown'} (Socket ID: ${
        socket.id
      }). Error: ${error.message}`
    );
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing servers...');
  io.close(() => {
    console.log('Socket.IO server closed.');
    httpServer.close(() => {
      console.log('HTTP server closed.');
      prisma.$disconnect().then(() => {
        console.log('Prisma client disconnected.');
        process.exit(0);
      });
    });
  });
});
