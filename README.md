# XZ Proxy - Telegram Mini App

A Telegram Mini App for selling proxy services with a balance deposit system, deployed on Vercel.

## Features

- **Telegram Integration**: Secure user authentication using Telegram's initData
- **Wallet System**: View balance, deposit funds
- **Proxy Products**: Purchase proxy packages with different GB options
- **Payment Integration**: RupantorPay payment processing
- **Security**: Protection against replay and double-spend attacks
- **Modern UI**: Dark-themed dashboard interface

## Tech Stack

- **Platform**: Vercel
- **Backend**: Node.js (TypeScript) - Vercel Serverless Functions
- **Frontend**: Telegram Mini App (HTML, CSS, JS + Telegram WebApp SDK)
- **Database**: Vercel Postgres / Supabase / Neon
- **ORM**: Prisma

## Core Functionality

### Wallet System
- View current balance
- Deposit funds via RupantorPay
- Transaction history

### Proxy Products
- Product: "ABC (GB) Proxy"
- Description: Non-expiring residential proxies, global coverage
- GB options: 1, 2, 5, 10, 15, 20, 25, 30, 50, 100 GB
- Dynamic price calculation
- Stock availability check

### Payment Flow
1. Create checkout via POST `/api/payment/checkout`
2. Verify payment using `/api/payment/verify-payment`
3. Credit user wallet after successful verification
4. Prevent duplicate credits using payment reference ID

### Purchase Flow
1. User selects GB + quantity
2. System checks wallet balance
3. Deduct balance
4. Generate proxy credentials (IP, Port, Username, Password)
5. Deliver proxy details inside Telegram Mini App

## API Routes

- `GET /api/wallet/balance` - Get user balance
- `POST /api/wallet/deposit` - Initiate deposit
- `GET /api/products/list` - Get available proxy products
- `POST /api/create-checkout` - Create RupantorPay checkout
- `POST /api/verify-payment` - Verify payment status
- `POST /api/proxy/purchase` - Purchase proxy package
- `POST /api/payment-callback` - Handle payment callbacks

## Security

- Telegram initData validation
- Payment status verification
- Replay attack protection
- Double-spend prevention
- Unique payment reference ID validation

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
RUPANTOR_API_KEY=your_rupantor_api_key
SUCCESS_URL=https://your-app.vercel.app/success
CANCEL_URL=https://your-app.vercel.app/cancel
CALLBACK_URL=https://your-app.vercel.app/api/payment-callback
DATABASE_URL=your_database_url
```

## Deployment

The app is designed for deployment on Vercel:

1. Push code to a GitHub repository
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## Database Schema

The Prisma schema includes models for:
- User: Telegram user information and balance
- Transaction: Record of all financial transactions
- ProxyProduct: Available proxy packages
- ProxyPurchase: Record of proxy purchases
- Payment: Payment verification records