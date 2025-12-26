import { validateTelegramInitData, getUserFromInitData } from '../../../lib/telegram';

// In a real implementation, you would import PrismaClient from '@prisma/client'
// For now, we'll use a mock for compilation purposes
const prisma = {
  proxyProduct: {
    findMany: async (args: any) => [
      {
        id: 'product-1',
        name: 'ABC (GB) Proxy',
        description: 'Non-expiring residential proxies, global coverage',
        gbOptions: [1, 2, 5, 10, 15, 20, 25, 30, 50, 100],
        pricePerGb: 1.50, // $1.50 per GB
        stock: 1000,
        isActive: true,
      }
    ], // Mock implementation
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

    // In a real implementation, you would verify the user exists in the database
    const userData = getUserFromInitData(init_data);

    // Get all active proxy products
    const products = await prisma.proxyProduct.findMany({
      where: {
        isActive: true,
      }
    });

    return res.status(200).json(products);

  } catch (error) {
    console.error('Error fetching proxy products:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}