# Scratch 'n SOL - Solana Scratch Card Game

## Overview

Scratch 'n SOL is a complete Solana-based scratch card game web application that allows users to purchase virtual scratch cards using SOL cryptocurrency and potentially win prizes. The application features a modern, neon-themed UI with real Solana wallet integration and secure payment processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 using TypeScript, leveraging modern web technologies:
- **Framework**: React with TypeScript for type safety
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: Tailwind CSS with custom neon theme and shadcn/ui components
- **State Management**: React Query (TanStack Query) for server state management
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
The backend follows a simple Express.js server architecture:
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API endpoints
- **Storage**: PostgreSQL database with Drizzle ORM (DatabaseStorage implementation)
- **Blockchain Integration**: Solana Web3.js for blockchain interactions with demo mode support
- **Development**: Development server with hot module replacement via Vite

### Database Design
The application uses PostgreSQL with Drizzle ORM for data persistence:
- **ORM**: Drizzle ORM with Neon PostgreSQL serverless adapter
- **Tables**: 
  - `games` - Stores game sessions, purchases, and results with full game history
  - `gameStats` - Tracks overall game statistics and pool balance in real-time
- **Implementation**: Full PostgreSQL integration with persistent data storage

## Key Components

### Wallet Integration
- **Solana Wallet Adapter**: Full integration supporting Phantom, Solflare, and Backpack wallets
- **Network Support**: Configurable for devnet (development) and mainnet (production)
- **Transaction Signing**: Real wallet transactions for purchasing scratch cards

### Game Logic
- **Ticket Types**: 5 different scratch card tiers (0.1 to 1.0 SOL) with corresponding max wins
- **Random Generation**: Client-side symbol generation with win/loss determination
- **Multipliers**: Random multipliers (1x, 2x, 5x, 10x) for winning games
- **Payment Split**: 10% to team wallet, 90% to prize pool

### UI/UX Design
- **Theme**: Neon cyberpunk aesthetic with custom CSS variables
- **Responsive**: Mobile-first design with Tailwind CSS
- **Components**: Reusable UI components from shadcn/ui library
- **Animations**: Custom scratch card reveal animations

## Data Flow

1. **User Connection**: User connects Solana wallet through wallet adapter
2. **Ticket Selection**: User selects scratch card tier and confirms purchase
3. **Payment Processing**: 
   - Transaction created splitting payment between team and pool wallets
   - User signs transaction with their wallet
   - Transaction broadcasted to Solana network
4. **Game Play**: 
   - Game symbols generated client-side
   - Win/loss determination and multiplier calculation
   - Game data stored in backend
5. **Prize Distribution**: 
   - Winning amounts sent from pool wallet to player
   - Game statistics updated

## External Dependencies

### Blockchain
- **Solana Network**: Primary blockchain for all transactions
- **@solana/web3.js**: Core Solana JavaScript SDK
- **@solana/wallet-adapter**: Wallet connection and transaction signing
- **@neondatabase/serverless**: Database connection (configured but not actively used)

### UI/Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI components for accessibility
- **Lucide React**: Icon library
- **Google Fonts**: Orbitron font for futuristic aesthetic

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety and better developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **Drizzle Kit**: Database migration and schema management

## Recent Changes
- **January 28, 2025**: Added full PostgreSQL database integration
  - Migrated from in-memory storage to persistent database
  - Implemented demo mode for wallet connection and payouts
  - Added proper error handling for demo vs production modes
  - All game data now persists between server restarts

## Deployment Strategy

### Environment Configuration
- **Development**: Uses devnet, in-memory storage, hot reloading
- **Production**: Configured for mainnet, PostgreSQL database (when migrated)
- **Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `POOL_WALLET_PRIVATE_KEY`: Private key for prize payouts
  - `SOLANA_RPC_URL`: Custom RPC endpoint
  - `VITE_SOLANA_NETWORK`: Network selection (devnet/mainnet)
  - `VITE_TEAM_WALLET`: Team wallet public key
  - `VITE_POOL_WALLET`: Pool wallet public key

### Build Process
- **Frontend**: Vite builds React app to `dist/public`
- **Backend**: ESBuild compiles TypeScript server to `dist/index.js`
- **Single Server**: Express serves both API endpoints and static frontend files

### Security Considerations
- **Private Key Management**: Pool wallet private key stored securely on server-side only
- **Transaction Verification**: All blockchain transactions verified before processing
- **CORS**: Configured for production domains
- **Input Validation**: Zod schemas for API request validation

The application is designed for easy deployment to platforms like Replit, with development mode detection and appropriate configuration switching between environments.