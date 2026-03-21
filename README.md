# Vigil — Elder Financial Fraud Prevention Agent

> AI guardian for elderly crypto wallets. Every transaction is analyzed by Venice AI (private, zero-retention). High-risk transfers are held in escrow until a family guardian approves.

Built for **[The Synthesis Hackathon](https://synthesis.devfolio.co)** · March 2026

---

## The Problem

**$28 billion** is lost to elder financial fraud every year in the US alone. As crypto becomes mainstream, elderly users are the #1 target for scammers — fake "yield" sites, fake support calls, romance scams. Traditional wallets have no safety net.

Vigil gives every elderly crypto user a silent, always-on guardian that:
- Analyzes every outbound transaction with private AI (Venice)
- Holds large transfers in escrow until a family member co-signs
- Sends instant Telegram alerts with AI reasoning and one-tap approve/cancel buttons
- Writes all risk scores on-chain for full auditability

---

## Live Demo

| Resource | Link |
|---|---|
| Guardian Dashboard | https://vigil-guardian.vercel.app |
| Demo Scam Page | https://vigil-guardian.vercel.app/demo |
| Contract (Base Sepolia) | `0x38d5d97C29440C7a50cCc489928bC36392fb4981` |
| ERC-8004 Agent #2279 | https://8004agents.ai/base-sepolia/agent/2279 |
| Agent Stats (live) | `GET <railway-url>/stats` |

**Try it:** Go to `/demo` → click "Claim ETH Yield Position" → watch the Guardian Console intercept it within 15 seconds.

---

## Architecture

```
User → GuardianWallet.sol (Base)
              │
       TransactionProposed / DirectTransfer events
              │
         Vigil Agent (Railway) ← polls every 15s
              │
     ┌────────┼──────────────┐
     │        │              │
  signals  Venice AI    ERC-8004 receipt
  (6 rules) (private   (feedback hash
             inference)  on-chain)
     │        │              │
     └────────┼──────────────┘
              │
         setRiskScore() → GuardianWallet.sol
              │
         Telegram Alert → Guardian's phone
         [✓ Approve] [✗ Cancel] buttons
              │
         contract.approve() / contract.cancel()
```

**Key design decisions:**
- Agent wallet has **no financial permissions** — it can only call `setRiskScore()`. Funds are never at risk.
- Venice AI runs in **private/no-retention mode** — transaction data never leaves Venice's inference infrastructure.
- Conservative fallback: if Venice is unreachable, Vigil defaults to **HIGH risk** and alerts the guardian.
- All risk scores and decisions are written **on-chain** for full auditability.

---

## Prize Tracks

### Venice Private Agents ($11,500)
Venice AI is core to Vigil's safety model:
- Every transaction is analyzed with `llama-3.3-70b` in private inference mode (`include_venice_system_prompt: false`, `enable_web_search: 'off'`, no data retention)
- The prompt passes only abstracted data (ETH value, recipient type, signals) — never raw addresses or PII
- A **second Venice call** runs "behavioral pattern analysis" when 3+ suspicious transactions are detected in 30 minutes, giving guardians a session-level threat summary
- Venice's reasoning is shown verbatim in Telegram alerts so guardians understand _why_ Vigil flagged something, not just _that_ it was flagged

### Base Agent Services ($5,000)
- `GuardianWallet.sol` deployed and verified on Base Sepolia
- Agent monitors Base events in real-time (15s poll cycle)
- All risk scores written on-chain via `setRiskScore()` — risk is part of the ledger, not just an off-chain alert
- Guardian approve/cancel executes on-chain via Telegram inline keyboard buttons

### Agents With Receipts — ERC-8004 ($4,000)
- Vigil registered as ERC-8004 Agent #2279 on Base Sepolia
- Every transaction analysis emits a feedback hash (`keccak256` of the full reasoning payload) stored on-chain via `RiskScoreSet` events
- When `FEEDBACK_SIGNER_KEY` is configured (separate wallet, required by ERC-8004's anti-self-feedback rule), full `giveFeedback()` receipts are emitted to the Reputation Registry
- The agent manifest is hosted at `docs/agent-registration.json` and linked to the ERC-8004 NFT

### Student Founder's Bet ($2,500)
> Built by a student at **University of Oregon**, graduating **2027**.

---

## How It Works

### 1. Smart contract escrow
`GuardianWallet.sol` is a proxy wallet for the elderly user:
- Transactions **below** the guardian threshold → `executeDirectly()`, goes through but Vigil still analyzes it
- Transactions **above** the threshold → `propose()`, funds locked in escrow until a guardian calls `approve()` or `cancel()`

### 2. Signal detection (6 heuristics)
Every transaction is scored against 6 binary signals before Venice sees it:

| Signal | Weight | What it detects |
|---|---|---|
| `FIRST_TIME_RECIPIENT` | 0.4 | Address never seen before |
| `ABOVE_THRESHOLD` | 0.5 | Transaction escrowed (above guardian limit) |
| `CONTRACT_INTERACTION` | 0.45 | Calldata present (DeFi / smart contract call) |
| `RAPID_SUCCESSION` | 0.35 | 3+ transactions in 10 minutes |
| `UNUSUAL_HOUR` | 0.3 | 2am–6am UTC (scam pressure window) |
| `ROUND_NUMBER_AMOUNT` | 0.2 | Suspicious round ETH amounts |

### 3. Venice AI analysis
The composite signal score and transaction summary are sent to Venice:
- Model: `llama-3.3-70b`
- Private inference, no data retention, web search disabled
- Returns: `{ riskScore, riskLevel, reasoning, recommendedAction, confidence }`
- **Session context**: recent transaction history is passed to Venice for pattern-aware analysis
- Conservative fallback if Venice is unavailable: defaults to HIGH risk (75/100)

### 4. On-chain attestation
For escrowed transactions, Venice's risk score and reasoning are written back on-chain via `setRiskScore()`. This is visible in the Guardian Dashboard and in the contract's event log.

### 5. Guardian alert
Telegram message with:
- Risk score bar (visual, 0-100)
- Venice's reasoning in plain English
- Triggered signals as emoji chips
- Inline buttons: `✓ Approve` / `✗ Cancel` — these execute the on-chain action directly

### 6. Behavioral pattern alerts
When 3+ suspicious transactions are detected in a 30-minute window, Vigil triggers a second Venice call for a session-level pattern summary and sends a separate "⚠️ BEHAVIORAL PATTERN DETECTED" alert.

---

## Quick Start

### 1. Deploy the contract

```bash
cd contracts
forge install
cp ../.env.example .env  # fill in OWNER_ADDRESS, PRIVATE_KEY, BASESCAN_API_KEY
forge script script/Deploy.s.sol \
  --rpc-url https://sepolia.base.org \
  --broadcast --verify
```

### 2. Start the agent

```bash
cd agent
npm install
cp ../.env.example .env
# Required: CONTRACT_ADDRESS, AGENT_PRIVATE_KEY, VENICE_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
# Optional: FEEDBACK_SIGNER_KEY (second wallet for ERC-8004 on-chain receipts)
npm run dev
```

### 3. Run the frontend

```bash
cd frontend
npm install
cp ../.env.example .env.local
# Required: NEXT_PUBLIC_CONTRACT_ADDRESS
# Optional: NEXT_PUBLIC_AGENT_URL (Railway URL for live agent status badge)
npm run dev
```

Open http://localhost:3000 → `/demo` to trigger a scam transaction, then watch `/dashboard`.

---

## Project Structure

```
vigil/
├── contracts/           # Foundry — GuardianWallet.sol
│   ├── src/GuardianWallet.sol
│   ├── test/
│   └── script/Deploy.s.sol
├── agent/               # Node.js/TypeScript — Vigil AI agent
│   └── src/
│       ├── index.ts     # Entry point + HTTP server startup
│       ├── server.ts    # HTTP health (/health) and stats (/stats) endpoints
│       ├── monitor.ts   # Event polling loop + session history
│       ├── analyzer.ts  # Venice API — per-tx analysis + session pattern analysis
│       ├── signals.ts   # 6 suspicion signal detectors
│       ├── alerts.ts    # Telegram bot — alerts + callback handler
│       ├── onchain.ts   # ethers.js helpers
│       ├── erc8004.ts   # ERC-8004 identity + feedback receipts
│       ├── stats.ts     # In-memory stats store (served via /stats)
│       └── types.ts     # Shared interfaces
├── frontend/            # Next.js — Guardian Dashboard
│   └── src/
│       ├── app/         # Pages: / /setup /dashboard /demo
│       └── components/  # TransactionFeed, PendingApprovals, AlertHistory,
│                        # ImpactStats, AgentStatus, ContractStats, RiskBadge
└── docs/
    └── agent-registration.json  # ERC-8004 agent manifest
```

---

## Security Model

| Property | How it's enforced |
|---|---|
| Agent can't steal funds | Agent wallet only has permission to call `setRiskScore()` — no `approve()`, no `cancel()`, no transfers |
| Private AI analysis | Venice `include_venice_system_prompt: false`, `enable_web_search: off`, no data retention |
| No raw addresses in Venice | Prompt passes recipient *type* and *first-time* boolean, not the actual address |
| Conservative failure mode | Venice unavailable → default HIGH risk (75/100) + ALERT_GUARDIAN |
| On-chain auditability | Every risk score written to chain via `RiskScoreSet` event |
| Replay protection | `processedTxHashes` persisted to disk — survives Railway instance restarts |

---

## Tech Stack

- **Smart Contract**: Solidity 0.8.20 · Foundry · Base (Sepolia + Mainnet)
- **Agent**: Node.js · TypeScript · ethers.js v6 · Venice API (`llama-3.3-70b`)
- **Frontend**: Next.js 15 · wagmi v2 · viem · Tailwind CSS
- **Alerts**: Telegram Bot API (inline keyboard callbacks for approve/cancel)
- **Identity**: ERC-8004 on Base · Agent #2279
- **Deploy**: Vercel (frontend) · Railway (agent — always-on)
