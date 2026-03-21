# AGENTS.md — Vigil Agent

## Identity
- **Agent Name**: Vigil
- **ERC-8004 Agent ID**: 2279 (Base Sepolia) — https://8004agents.ai/base-sepolia/agent/2279
- **Agent Wallet**: 0x5DacE6e950F3e8c18684395B518EdE2465a895b0
- **Dashboard**: https://vigil-guardian.vercel.app
- **Agent Stats API**: `GET <railway-url>/stats`

## Purpose
Monitors a GuardianWallet smart contract on Base for suspicious outbound transactions.
Analyzes each transaction using Venice API (private, no-retention inference).
Alerts guardians via Telegram with one-tap approve/cancel buttons.
Emits on-chain risk scores and ERC-8004 feedback receipts.
Detects behavioral patterns across transaction sessions.

## Capabilities
- Real-time event polling (Base contract — TransactionProposed, DirectTransfer) every 15s
- Privacy-preserving per-transaction risk analysis (Venice AI / llama-3.3-70b, no data retention)
- 6 suspicion signal detectors: FIRST_TIME_RECIPIENT, ABOVE_THRESHOLD, UNUSUAL_HOUR, RAPID_SUCCESSION, CONTRACT_INTERACTION, ROUND_NUMBER_AMOUNT
- **Behavioral session analysis**: second Venice call when 3+ suspicious transactions detected in 30 minutes — gives session-level threat summary
- Guardian alerting via Telegram Bot API (HTML-formatted, inline keyboard approve/cancel)
- On-chain risk score attestation (setRiskScore) — visible in contract events and dashboard
- ERC-8004 feedback receipts (giveFeedback on ReputationRegistry when FEEDBACK_SIGNER_KEY is set)
- HTTP health/stats server (/health, /stats) — enables live "Agent Online" badge in dashboard

## Trust Model
- Agent wallet has NO financial permissions — can only call setRiskScore(), never transfer funds
- All financial analysis on Venice (private mode, no data retention, web search off)
- Transaction data is abstracted before Venice: recipient type, ETH value, signal list — no raw addresses
- All agent actions logged on-chain (RiskScoreSet events)
- Conservative fallback: if Venice fails, defaults to HIGH risk (score 75) + ALERT_GUARDIAN
- Deduplication: processedTxHashes persisted to disk — no duplicate alerts across Railway restarts

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
Key optional variables:
- `FEEDBACK_SIGNER_KEY`: separate EOA for ERC-8004 on-chain feedback receipts (must differ from AGENT_PRIVATE_KEY)
- `PORT`: HTTP server port (Railway sets this automatically)
- `NEXT_PUBLIC_AGENT_URL`: Railway URL so the dashboard can show live agent status

## Architecture
```
GuardianWallet.sol  ←──────────────────── User proposes/executes transactions
        │
        │ events (TransactionProposed, DirectTransfer)
        ▼
   monitor.ts  ──── signal detection ──── signals.ts (6 heuristics)
        │                                     │
        │ tx + signals + session history       │
        ▼                                     │
   analyzer.ts  ─── Venice API ──────── llama-3.3-70b (private inference)
        │            (2 calls: per-tx          │
        │             + session pattern        │
        │             when 3+ threats)         │
        ├── setRiskScore() ──────────── GuardianWallet.sol (on-chain attestation)
        ├── giveFeedback() ──────────── ERC-8004 ReputationRegistry (feedback signer)
        ├── sendTelegramAlert() ──────── Guardian's phone [✓ Approve] [✗ Cancel]
        └── sendPatternAlert() ──────── Guardian's phone (session-level warning)

   server.ts ─── HTTP /health /stats ──── Dashboard AgentStatus component
```
