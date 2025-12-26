import { validateTelegramInitData, getUserFromInitData } from '../../lib/telegram';

// In a real implementation, you would import PrismaClient from '@prisma/client'
// For now, we'll use a mock for compilation purposes
declare var process: { env: Record<string, string | undefined> };

const prisma = {
  transaction: {
    findUnique: async (args: any) => {
      // Mock implementation - in a real app, this would query the database
      if (args.where.referenceId === 'valid-transaction') {
        return { 
          id: 'transaction-id', 
          userId: 'user-id', 
          amount: 10.00, 
          status: 'pending',
          type: 'deposit'
        };
      }
      return null;
    },
    update: async (args: any) => ({ 
      ...args.data,
      id: args.where.id,
    }), // Mock implementation
  },
  user: {
    findUnique: async (args: any) => {
      // Mock implementation - in a real app, this would query the database
      if (args.where.telegramId === 'existing-user') {
        return { id: 'existing-user-id', balance: 10.50, firstName: 'John', lastName: 'Doe', username: 'johndoe', telegramId: args.where.telegramId };
      }
      return null;
    },
    update: async (args: any) => ({ 
      ...args.data,
      id: args.where.id,
      balance: args.data.balance || 0
    }), // Mock implementation
  },
  payment: {
    findUnique: async (args: any) => {
      // Mock implementation
      if (args.where.referenceId === 'verified-payment') {
        return { 
          id: 'payment-id', 
          referenceId: 'verified-payment', 
          userId: 'user-id', 
          amount: 10.00, 
          status: 'verified' 
        };
      }
      return null;
    },
    create: async (args: any) => ({ 
      id: 'payment-id',
      referenceId: args.data.referenceId,
      userId: args.data.userId,
      amount: args.data.amount,
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
    const { init_data, reference_id } = req.body;

    if (!init_data || typeof init_data !== 'string') {
      return res.status(400).json({ error: 'Telegram init data is required' });
    }

    if (!reference_id) {
      return res.status(400).json({ error: 'Reference ID is required' });
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

    // Check if payment was already processed to prevent duplicates
    const existingPayment = await prisma.payment.findUnique({
      where: { referenceId: reference_id },
    });

    if (existingPayment && existingPayment.status === 'verified') {
      return res.status(200).json({ 
        status: 'already_processed', 
        message: 'Payment already processed',
        balance: user.balance
      });
    }

    // Verify payment with RupantorPay API
    const rupantorApiKey = process.env.RUPANTOR_API_KEY;
    if (!rupantorApiKey) {
      return res.status(500).json({ error: 'Payment configuration missing' });
    }

    const response = await fetch(`https://api.rupantorpay.com/api/payment/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': rupantorApiKey,
      },
      body: JSON.stringify({
        reference_id: reference_id
      }),
    });

    if (!response.ok) {
      throw new Error(`RupantorPay verification API error: ${response.status} ${response.statusText}`);
    }

    const verificationResult = await response.json();

    if (verificationResult.status === 'completed' || verificationResult.status === 'success') {
      // Check if transaction exists and hasn't been processed yet
      const transaction = await prisma.transaction.findUnique({
        where: { referenceId: reference_id },
      });

      if (transaction && transaction.status === 'pending') {
        // Update user's balance
        const updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: parseFloat(verificationResult.amount) }
          }
        });

        // Create payment record to prevent duplicates
        await prisma.payment.create({
          data: {
            referenceId: reference_id,
            userId: user.id,
            amount: parseFloat(verificationResult.amount),
            status: 'verified'
          }
        });

        // Update transaction status
        await prisma.transaction.update({
          where: { referenceId: reference_id },
          data: { status: 'completed' }
        });

        return res.status(200).json({ 
          status: 'verified', 
          message: 'Payment verified and balance updated',
          balance: updatedUser.balance,
          amount: parseFloat(verificationResult.amount)
        });
      } else {
        // Transaction was already processed
        return res.status(200).json({ 
          status: 'already_processed', 
          message: 'Payment already processed',
          balance: user.balance
        });
      }
    } else {
      // Payment not verified, update transaction status
      await prisma.transaction.update({
        where: { referenceId: reference_id },
        data: { status: 'failed' }
      });

      return res.status(200).json({ 
        status: 'failed', 
        message: 'Payment verification failed',
        balance: user.balance
      });
    }

  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Failed to verify payment' });
  } finally {
    await prisma.$disconnect();
  }
}