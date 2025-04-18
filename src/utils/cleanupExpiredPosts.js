import prisma from '../lib/prisma';

async function cleanup() {
  console.log('Starting cleanup of expired posts...');
  const now = new Date();
  try {
    const result = await prisma.post.deleteMany({
      where: {
        expiresAt: { lt: now },
        isPinned: false,
      },
    });
    console.log(`Cleanup complete. Deleted ${result.count} expired posts.`);
  } catch (error) {
    console.error('Error during post cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
