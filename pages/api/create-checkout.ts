import { validateTelegramInitData, getUserFromInitData } from '../../lib/telegram';

// In a real implementation, you would import PrismaClient from '@prisma/client'
// For now, we'll use a mock for compilation purposes
declare var process: { env: Record<string, string | undefined> };

const prisma = {
  user: {
    findUnique: async (args: any) => {
      // Mock implementation - in a real app, this would query the database
      if (args.where.telegramId === 'existing-user') {
        return { id: 'existing-user-id', balance: 10.50, firstName: 'John', lastName: 'Doe', username: 'johndoe', telegramId: args.where.telegramId };
      }
      return null;
    },
  },
  transaction: {
    create: async (args: any) => ({ 
      id: 'transaction-id',
      userId: args.data.userId,
      type: args.data.type,
      amount: args.data.amount,
      description: args.data.description,
      referenceId: args.data.referenceId,
      status: args.data.status
    }), // Mock implementation
  },
  $disconnect: async () => {},
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { init_data, amount, description } = req.body;

    if (!init_data || typeof init_data !== 'string') {
      return res.status(400).json({ error: 'Telegram init data is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!validateTelegramInitData(init_data)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Telegram init data' });
    }

    const userData = getUserFromInitData(init_data);
    const telegramId = userData.id.toString();

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get environment variables
    const rupantorApiKey = process.env.RUPANTOR_API_KEY;
    const successUrl = process.env.SUCCESS_URL;
    const cancelUrl = process.env.CANCEL_URL;
    const callbackUrl = process.env.CALLBACK_URL;

    if (!rupantorApiKey || !successUrl || !cancelUrl || !callbackUrl) {
      return res.status(500).json({ error: 'Payment configuration missing' });
    }

    // Create transaction record first
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'deposit',
        amount: parseFloat(amount),
        description: description || `Deposit for ${amount} USD`,
        status: 'pending',
        referenceId: `deposit_${Date.now()}_${user.id}`,
      }
    });

    // Prepare data for RupantorPay API
    const checkoutData = {
      amount: parseFloat(amount),
      description: description || `Deposit for ${amount} USD`,
      success_url: successUrl,
      cancel_url: cancelUrl,
      callback_url: callbackUrl,
      reference_id: transaction.referenceId,
      customer_email: user.username ? `${user.username}@telegram.com` : `user${user.id}@telegram.com`,
      customer_name: `${user.firstName} ${user.lastName}`.trim() || 'Telegram User'
    };

    // Make request to RupantorPay API
    const response = await fetch('https://api.rupantorpay.com/api/payment/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': rupantorApiKey,
      },
      body: JSON.stringify(checkoutData),
    });

    if (!response.ok) {
      throw new Error(`RupantorPay API error: ${response.status} ${response.statusText}`);
    }

    const paymentResponse = await response.json();

    return res.status(200).json({
      checkout_url: paymentResponse.checkout_url,
      reference_id: transaction.referenceId,
      amount: parseFloat(amount),
    });

  } catch (error) {
    console.error('Error creating checkout:', error);
    return res.status(500).json({ error: 'Failed to create payment checkout' });
  } finally {
    await prisma.$disconnect();
  }
}