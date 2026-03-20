# Vigil — Elder Financial Fraud Prevention Agent

> AI-powered guardian for elderly crypto wallets on Base. $28 billion is lost to elder financial fraud every year — Vigil is fighting back.

Built for [The Synthesis Hackathon](https://synthesis.devfolio.co) · March 2026

---

## How It Works

1. **GuardianWallet** smart contract acts as a proxy wallet for the elderly user
2. Transactions **above a threshold** are escrowed until a guardian co-signs
3. The **Vigil AI agent** monitors all contract events in real-time
4. Every transaction is analyzed by **Venice AI** (private, no data retention)
5. Guardians receive **Telegram alerts** with risk scores and Venice's reasoning
6. Risk scores are written **on-chain** and **ERC-8004 receipts** are emitted as proof

## Prize Tracks

| Track | Sponsor |
|---|---|
| Private Agents, Trusted Actions | Venice ($11,500) |
| Agent Services on Base | Base ($5,000) |
| Agents With Receipts (ERC-8004) | Protocol Labs ($4,000) |
| Student Founder's Bet | College.xyz ($2,500) |
| Synthesis Open Track | Community ($28,309) |

## Quick Start

### 1. Deploy the contract

```bash
cd contracts
cp ../.env.example .env  # fill in OWNER_ADDRESS, AGENT_ADDRESS, PRIVATE_KEY, etc.
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
```

### 2. Start the agent

```bash
cd agent
npm install
# set CONTRACT_ADDRESS, AGENT_PRIVATE_KEY, VENICE_API_KEY, TELEGRAM_* in .env
npm run dev
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 to access the Guardian Dashboard.

## Project Structure

```
vigil/
├── contracts/           # Foundry — GuardianWallet.sol
├── agent/               # Node.js/TypeScript — Vigil AI agent
│   └── src/
│       ├── index.ts     # Entry point
│       ├── monitor.ts   # Event subscription + polling loop
│       ├── analyzer.ts  # Venice API integration
│       ├── signals.ts   # 5 suspicion signal detectors
│       ├── alerts.ts    # Telegram bot
│       ├── onchain.ts   # ethers.js helpers
│       ├── erc8004.ts   # ERC-8004 identity + receipts
│       └── types.ts     # Shared interfaces
├── frontend/            # Next.js — Guardian Dashboard
└── docs/
    └── agent-registration.json  # ERC-8004 agent manifest
```

## Security

- Agent private key has **read-only-equivalent access** — it can only call `setRiskScore()`, never transfer funds
- All financial data analyzed by Venice with **no data retention**
- Conservative fallback: if Venice is unavailable, defaults to HIGH risk
- Guardian must sign on-chain to approve or cancel any escrowed transaction

## Tech Stack

- **Smart Contract**: Solidity 0.8.20, Foundry, Base
- **Agent**: Node.js, TypeScript, ethers.js v6, Venice API
- **Frontend**: Next.js 15, wagmi, viem, Tailwind CSS
- **Alerts**: Telegram Bot API
- **Identity**: ERC-8004 on Base
- **Deploy**: Vercel (frontend), Railway (agent)
