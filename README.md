# 🎰 Scratch 'n SOL

A Solana-based casino platform focused on scratch card gambling. Users can purchase virtual scratch cards using SOL cryptocurrency and potentially win prizes.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/react-18.3-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6-3178C6.svg)
![Solana](https://img.shields.io/badge/solana-web3-9945FF.svg)

## ✨ Features

- **🎮 Scratch Card Games** - 5 different tiers (0.1 to 1.0 SOL) with corresponding max wins
- **🔐 Solana Wallet Integration** - Full support for Phantom, Solflare, and Backpack wallets
- **💰 Real SOL Payments** - 90% to prize pool, 10% to team wallet
- **📊 Real-time Pool Balance** - Live blockchain balance for transparent prize pool
- **🎲 Provably Fair** - Server-side game outcome generation with cryptographic RNG
- **📱 Responsive Design** - Mobile-first neon cyberpunk aesthetic
- **🎰 Jackpot System** - Token-gated lottery with Bags.fm integration

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Blockchain**: Solana Web3.js + Wallet Adapter
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: Wouter
- **State**: React Query (TanStack Query)

### Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # Context providers (wallet, game mode)
│   │   ├── lib/           # Utilities and blockchain logic
│   │   └── pages/         # Page components
│   └── index.html         # HTML entry point
├── server/                # Backend Express server
│   ├── routes.ts          # API routes
│   ├── services/          # Business logic (Solana, casino engine)
│   ├── storage.ts         # Database storage layer
│   └── db.ts              # Database connection
├── shared/                # Shared types and schemas
│   └── schema.ts          # Drizzle ORM schema
└── dist/                  # Build output
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or cloud)
- Solana wallet with devnet SOL (for testing)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd Scratchndsol
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Required: PostgreSQL connection
DATABASE_URL=postgres://user:password@localhost:5432/scratchndsol

# Required: Pool wallet private key (base58)
# This wallet holds prize funds - KEEP SECRET!
POOL_WALLET_PRIVATE_KEY=your_base58_private_key_here

# Required: Solana network
VITE_SOLANA_NETWORK=devnet  # or 'mainnet' for production

# Optional: Custom RPC URL
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_URL=https://api.devnet.solana.com

# Required: Wallet addresses
VITE_TEAM_WALLET=your_team_wallet_address
VITE_POOL_WALLET=your_pool_wallet_public_key

# Optional: API keys for better RPC
HELIUS_API_KEY=your_helius_key
```

### 3. Database Setup

```bash
# Push schema to database
npm run db:push
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`

### 5. Build for Production

```bash
npm run build
npm start
```

## 🌐 Deployment

### Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Set Environment Variables** in Vercel Dashboard:
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.example`

4. **Add PostgreSQL Database**:
   - Use Vercel Postgres or any PostgreSQL provider
   - Add `DATABASE_URL` to environment variables

### Manual Server Deployment

```bash
# Build the app
npm run build

# Start production server
npm start
```

## 🔒 Security Considerations

### Critical Requirements

1. **POOL_WALLET_PRIVATE_KEY**: 
   - Must be kept secret at all times
   - Only stored server-side (never in frontend code)
   - Use environment variables only

2. **Environment Variables**:
   - Never commit `.env` to git
   - Use different keys for dev/production
   - Rotate keys regularly

3. **Pool Wallet**:
   - Maintain sufficient SOL for transaction fees
   - Monitor balance regularly
   - Use a hardware wallet for mainnet

4. **Rate Limiting**:
   - Built-in rate limiting on all endpoints
   - Payout limits: Max 10 SOL single, 50 SOL hourly, 200 SOL daily

## 🎮 How It Works

### Game Flow (Real Mode)

1. **Select Ticket** - Choose from 5 tiers (0.1-1.0 SOL)
2. **Connect Wallet** - Phantom/Solflare/Backpack
3. **Pay with SOL** - 90% to pool, 10% to team
4. **Scratch Card** - Reveal symbols (HTML5 Canvas)
5. **Win/Lose** - Server determines outcome
6. **Auto Payout** - Winnings sent directly to wallet

### Casino Engine

- Dynamic win rates based on pool balance
- House edge: 10%
- Max payout: 25% of pool balance
- Minimum reserve: 0.5 SOL

## 🐛 Troubleshooting

### Wallet Connection Issues

```bash
# Check if wallet adapter is installed
npm list @solana/wallet-adapter-react

# Clear browser cache and reload
```

### Transaction Failures

1. Check `POOL_WALLET_PRIVATE_KEY` is set correctly
2. Verify pool wallet has sufficient SOL for fees
3. Check Solana RPC endpoint is accessible

### Database Connection

```bash
# Test database connection
npm run db:push

# Check DATABASE_URL format
# Format: postgres://user:password@host:port/database
```

## 📚 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Get pool stats and balance |
| POST | `/api/games/create-and-play` | Create new game with verification |
| POST | `/api/games/payout` | Process winning payout |
| GET | `/api/games/:wallet` | Get player game history |
| POST | `/api/pool/check` | Check if pool can support game |
| POST | `/api/rpc-proxy` | Proxy RPC requests |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This is gambling software. Please ensure you:
- Comply with local laws and regulations
- Implement responsible gambling measures
- Provide clear terms of service
- Only deploy where legally permitted

## 🆘 Support

For issues and questions:
- Open an issue on GitHub
- Check existing issues first
- Provide detailed reproduction steps

---

Built with 💜 on Solana
