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
- **Scratch Cards**: 5 different tiers (0.1 to 1.0 SOL) with corresponding max wins
- **Arcade Games**: Phaser.js-powered games with demo-only mode currently
- **Random Generation**: Client-side symbol generation with win/loss determination
- **Multipliers**: Random multipliers (1x, 2x, 5x, 10x) for winning games
- **Payment Split**: 10% to team wallet, 90% to prize pool

### Games Architecture
- **NoCrying Escape**: Infinite runner built with Phaser.js and TypeScript
- **Custom Assets**: SVG-based sprites for character, obstacles, and backgrounds  
- **Demo Mode**: Full gameplay without wallet integration or payouts
- **Score Persistence**: localStorage-based best score tracking
- **Mobile Support**: Touch and keyboard controls (SPACE/click to jump)
- **Progressive Difficulty**: Speed increases every 10 seconds

### UI/UX Design
- **Theme**: Neon cyberpunk aesthetic with custom CSS variables
- **Responsive**: Mobile-first design with Tailwind CSS
- **Components**: Reusable UI components from shadcn/ui library
- **Scratch Interaction**: HTML5 Canvas-based real scratch mechanics requiring 60% completion
- **Game Navigation**: Header navigation between Scratch Cards and Games sections
- **Mode Toggle**: Visual indicators for Demo (🟢) vs Real (🟣) modes
- **Progressive UX**: Cards always visible, wallet connection only when needed

## Data Flow

### Demo Mode Flow
1. **Mode Selection**: User selects Demo mode (default)
2. **Ticket Selection**: User views and selects scratch card tier immediately
3. **Game Play**: User clicks "PLAY" to generate symbols using Math.random()
4. **Scratch Interaction**: User scratches canvas to reveal symbols (60% required)
5. **Result Display**: Win/loss shown with demo payout simulation

### Real Mode Flow  
1. **Mode Selection**: User switches to Real mode via header toggle
2. **Ticket Selection**: User views and selects scratch card tier immediately
3. **Wallet Connection**: When user clicks "PLAY", wallet connection triggered if needed
4. **Payment Processing**: Real SOL transaction with 90/10 split (pool/team)
5. **Game Play**: Symbols generated and scratch interaction begins
6. **Prize Distribution**: Actual SOL sent from pool wallet to winner

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
- **January 29, 2025**: Disabled Games section to focus on casino-style gameplay
  - Temporarily removed Games navigation link from header
  - Commented out all game routes in App.tsx (/games, /games/nocrying-escape, etc.)
  - User requested focus on casino-type plays like scratch cards rather than arcade games
  - Games section code preserved but hidden from user interface

- **January 28, 2025**: Added Games section with NoCrying Escape demo game (DISABLED)
  - Implemented new `/games` route with game cards layout and demo banner
  - Created NoCrying Escape: Phaser.js-powered infinite runner game
  - Generated custom SVG assets for character, obstacles (RUG, tear, coin), and backgrounds
  - Added Phaser.js integration with proper TypeScript support and mobile controls
  - Implemented demo-only mode with score tracking and localStorage persistence
  - Enhanced header navigation to include Games link on both home and games pages
  - Created reusable DemoBanner and GameModeBadge components

- **January 28, 2025**: Enhanced wallet connection flow and dual mode system
  - Added PostgreSQL database integration with persistent storage
  - Implemented dual mode toggle (Demo/Real) with localStorage persistence
  - Added real scratch interaction with HTML5 Canvas requiring 60% completion
  - Updated wallet connection to trigger only when needed for Real Mode purchases
  - Always display scratch cards regardless of wallet connection status
  - Demo mode allows immediate play without wallet requirements

- **January 28, 2025**: Fixed Solana wallet integration issues
  - Resolved "Invalid public key input" errors with proper validation
  - Added wallet balance fetching and display in header when connected
  - Implemented proper error handling for insufficient balance and invalid addresses
  - Fixed React hook conflicts by using full wallet context
  - Added environment variable validation for wallet addresses
  - Wallet now shows balance, address, and transaction status properly

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