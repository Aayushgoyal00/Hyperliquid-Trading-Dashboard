# 🚀 Hyperliquid Trading Dashboard

A modern, secure decentralized trading interface for [Hyperliquid](https://hyperliquid.xyz/) - built with Next.js 15, TypeScript, and Privy embedded wallets.

[![Next.js](https://img.shields.io/badge/Next.js-15.5-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Privy](https://img.shields.io/badge/Privy-3.0-purple?style=flat)](https://privy.io/)

## ✨ Features

### 🔐 Secure Wallet Management
- **Embedded Wallets** via [Privy](https://privy.io/) - no seed phrases needed
- **External Wallet Support** - connect MetaMask, Coinbase Wallet, etc.
- **Client-Side Signing** - all transactions signed locally, zero server-side secrets

### 📈 Trading Capabilities
- **Perpetual Futures** - Trade BTC, ETH, SOL, and 10+ more assets
- **Spot Trading** - Direct asset purchases
- **Market & Limit Orders** - Full order type support
- **Real-Time Pricing** - Live market data from Hyperliquid

### 💸 Fund Management
- **Spot ↔ Perps Transfers** - Move funds between accounts instantly
- **Withdrawals** - Send funds to any external wallet
- **Balance Tracking** - Real-time account value monitoring
- **Multi-Wallet Support** - Manage both embedded and external wallets

## 🏗️ Architecture

### Frontend-First Design
This app uses a **frontend-direct architecture** for maximum security and performance:

```
User → Privy Auth → Embedded Wallet → Client-Side Signing → Hyperliquid
```

**Key Benefits:**
- ✅ No backend secrets or API keys exposed
- ✅ Faster execution (no server round-trips)
- ✅ Better security (users control private keys)
- ✅ Simplified infrastructure

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm installed
- Privy account ([sign up here](https://privy.io/))
- Hyperliquid testnet/mainnet access

### 1. Clone the Repository

```bash
git clone https://github.com/Aayushgoyal00/Hyperliquid-privy-setup.git
cd Hyperliquid-privy-setup
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# Optional: Network Configuration
NEXT_PUBLIC_HYPERLIQUID_NETWORK=testnet  # or mainnet
```

**Get Your Privy Credentials:**
1. Go to [Privy Dashboard](https://dashboard.privy.io/)
2. Create a new app
3. Copy your App ID and App Secret
4. Enable "Embedded Wallets" in settings

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
privy-setup/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing (redirects to dashboard)
│   │   ├── dashboard/         # Main dashboard page
│   │   ├── trade/             # Order placement page
│   │   ├── transfer/          # Spot-Perps transfer page
│   │   ├── withdraw/          # Withdrawal page
│   │   └── api/
│   │       └── onboard/       # Wallet creation endpoint
│   ├── components/            # React components
│   │   ├── PrivyWrapper.tsx   # Privy authentication wrapper
│   │   ├── TradingForm.tsx    # Order placement UI
│   │   ├── WithdrawForm.tsx   # Withdrawal UI
│   │   ├── SpotPerpsTransfer.tsx
│   │   ├── WalletInfo.tsx
│   │   ├── MarketData.tsx
│   │   └── FundingStatus.tsx
│   ├── services/              # Business logic
│   │   └── hyperliquid.ts     # Hyperliquid API client
│   ├── utils/                 # Utility functions
│   │   └── privy-signature.ts # Privy server client
│   └── types/                 # TypeScript definitions
│       └── trading.ts
├── public/                    # Static assets
├── .env.example                 # Environment variables (create this)
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## 🎯 Usage Guide

### 1. Authentication
- Click "Login" on the landing page
- Connect with email, social, or external wallet
- Privy creates an embedded wallet automatically

### 2. Fund Your Wallet
- Go to **Dashboard**
- Copy your embedded wallet address
- Send USDC or ETH to the address (on Arbitrum network)
- **Or** transfer from connected external wallet

### 3. Place Orders
- Navigate to **📈 Place Orders**
- Select asset (BTC, ETH, SOL, etc.)
- Choose Market or Limit order
- Enter size and price
- Click Buy/Sell

### 4. Transfer Between Accounts
- Go to **🔄 Spot-Perps Transfer**
- Select direction (Spot → Perps or vice versa)
- Enter amount
- Confirm transfer

### 5. Withdraw Funds
- Navigate to **💸 Withdraw**
- Enter destination wallet address
- Enter amount
- Confirm withdrawal


## 🙏 Acknowledgments

- [Hyperliquid](https://hyperliquid.xyz/) - For the powerful trading infrastructure
- [Privy](https://privy.io/) - For seamless embedded wallet solution
- [@nktkas/hyperliquid](https://www.npmjs.com/package/@nktkas/hyperliquid) - Excellent Hyperliquid SDK

**Built with ❤️ by [@Aayushgoyal00](https://github.com/Aayushgoyal00)**

*Star ⭐ this repo if you find it helpful!*
