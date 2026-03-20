# AGENTS.md — Vigil Agent

## Identity
- **Agent Name**: Vigil
- **ERC-8004 Agent ID**: [fill after registration]
- **Agent Wallet**: [fill after wallet created]
- **Dashboard**: https://vigil.vercel.app

## Purpose
Monitors a GuardianWallet smart contract on Base for suspicious outbound transactions.
Analyzes each transaction using Venice API (private, no-retention inference).
Alerts guardians via Telegram. Emits on-chain risk score and ERC-8004 receipts.

## Capabilities
- Real-time event subscription to Base contract (TransactionProposed, DirectTransfer)
- Privacy-preserving risk analysis (Venice AI / llama-3.3-70b, no data retention)
- 5 suspicion signal detectors: FIRST_TIME_RECIPIENT, ABOVE_THRESHOLD, UNUSUAL_HOUR, RAPID_SUCCESSION, CONTRACT_INTERACTION
- Guardian alerting via Telegram Bot API
- On-chain risk score attestation (setRiskScore)
- ERC-8004 feedback receipts (giveFeedback) for every analyzed transaction

## Trust Model
- Agent cannot initiate transfers or hold funds
- Agent private key scoped only to setRiskScore() on GuardianWallet
- All financial analysis on Venice (no data retention, private inference)
- All agent actions logged on-chain (RiskScoreSet events + ERC-8004 receipts)
- Conservative fallback: if Venice fails, defaults to HIGH risk

## Running
```bash
cd agent
cp ../.env.example .env
# fill in your values
npm install
npm run dev
```

## Environment Variables
See `.env.example` in the repo root for all required variables.

## Architecture
```
GuardianWallet.sol  ←──────────────────── User proposes/executes transactions
        │
        │ events (TransactionProposed, DirectTransfer)
        ▼
   monitor.ts  ──── signal detection ──── signals.ts
        │
        │ abstracted tx summary (no private data)
        ▼
   analyzer.ts  ─── Venice API ──────── llama-3.3-70b (private inference)
        │
        ├── setRiskScore() ──────────── GuardianWallet.sol (on-chain attestation)
        ├── giveFeedback() ──────────── ERC-8004 Registry (receipt)
        └── sendTelegramAlert() ──────── Guardian's phone
```
