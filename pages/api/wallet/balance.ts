import { validateTelegramInitData, getUserFromInitData } from '../../../lib/telegram';

// In a real implementation, you would import PrismaClient from '@prisma/client'
// For now, we'll use a mock for compilation purposes
const prisma = {
  user: {
    findUnique: async (args: any) => {
      // Mock implementation - in a real app, this would query the database
      if (args.where.telegramId === 'existing-user') {
        return { id: 'existing-user-id', balance: 10.50, firstName: 'John', lastName: 'Doe', telegramId: args.where.telegramId };
      }
      return null;
    },
    create: async (args: any) => ({ id: 'new-user-id', balance: 0, firstName: args.data.firstName, lastName: args.data.lastName, telegramId: args.data.telegramId }), // Mock implementation
  },
  $disconnect: async () => {},
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { init_data } = req.query;

    if (!init_data || typeof init_data !== 'string') {
      return res.status(400).json({ error: 'Telegram init data is required' });
    }

    if (!validateTelegramInitData(init_data)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Telegram init data' });
    }

    const userData = getUserFromInitData(init_data);
    const telegramId = userData.id.toString();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          telegramId,
          firstName: userData.first_name || '',
          lastName: userData.last_name || '',
          username: userData.username || '',
          photoUrl: userData.photo_url || '',
        },
      });
    }
    
    // Handle the case where user might still be null
    if (!user) {
      user = { id: 'fallback-id', balance: 0, firstName: '', lastName: '', telegramId };
    }

    return res.status(200).json({ 
      balance: user.balance,
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName
    });

  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}