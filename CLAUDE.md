# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Vigil** — Elder financial fraud prevention agent on Base blockchain. Monitors a `GuardianWallet` smart contract, analyzes every transaction privately via Venice AI, and alerts family guardians via Telegram. Large transactions (above threshold) are held in escrow until a guardian co-signs.

**Deployed:**
- Contract: `0x38d5d97C29440C7a50cCc489928bC36392fb4981` (Base Sepolia)
- Frontend: `https://vigil-guardian.vercel.app`
- Agent: Railway (persistent 24/7)
- ERC-8004 agentId: `2279`

---

## Repository Structure

```
synthesis/
├── contracts/          # Foundry — GuardianWallet.sol
├── agent/              # Node.js/TypeScript — AI monitoring agent
└── frontend/           # Next.js — Guardian dashboard
```

---

## Commands

### Contracts (Foundry)
```bash
cd contracts
forge build
forge test
forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast --verify
```

### Agent
```bash
cd agent
npm install
cp .env.example .env   # fill in required vars
npm run dev            # tsx watch (hot reload)
npm run build          # compile TypeScript → dist/
npm run start          # run compiled dist/index.js
npm run lint           # tsc --noEmit (type-check only, no tests)
```

**Required env vars for agent:** `CONTRACT_ADDRESS`, `AGENT_PRIVATE_KEY`, `VENICE_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

**Optional:** `RPC_URL` (default: `https://sepolia.base.org`), `AGENT_ID` (set after first registration to skip re-registration), `ERC8004_REGISTRY_ADDRESS`, `SEEN_ADDRESSES_PATH` (default: `./data/seen_addresses.json`), `POLL_INTERVAL_MS` (default: 15000)

### Frontend
```bash
cd frontend
npm install
npm run dev            # Next.js dev server
npm run build          # production build
npm run lint           # ESLint
```

**Required env var:** `NEXT_PUBLIC_CONTRACT_ADDRESS` (set with `printf` not `echo` to avoid trailing newlines)

---

## Architecture

### Smart Contract (`contracts/src/GuardianWallet.sol`)

Proxy wallet for elderly person. Solidity 0.8.20, no OpenZeppelin.

- `propose()` — owner sends ETH above threshold → locked in escrow, emits `TransactionProposed`
- `executeDirectly()` — owner sends ETH below threshold → executed immediately, emits `DirectTransfer`
- `approve(txId)` / `cancel(txId)` — guardian releases or refunds escrowed funds
- `setRiskScore(txId, score, reason)` — agent-only, annotates pending txns with Venice score
- `addGuardian(addr, telegramHandle)` — owner adds guardian (also registers agent wallet as guardian so it can call approve/cancel)
- `setThreshold(wei)` — owner sets escrow threshold (currently 0.001 ETH = 1e15 wei)

**Key events the agent monitors:** `TransactionProposed`, `DirectTransfer`
**Key events the frontend monitors:** all of the above plus `TransactionExecuted`, `TransactionCancelled`, `RiskScoreSet`, `SuspiciousActivityFlagged`

### Agent (`agent/src/`)

Runs a polling loop every 15s (public RPCs don't support `eth_filters`).

**Data flow per transaction:**
1. `monitor.ts` — detects `TransactionProposed` / `DirectTransfer` events
2. `signals.ts` — evaluates 5 suspicion signals (FIRST_TIME_RECIPIENT, ABOVE_THRESHOLD, UNUSUAL_HOUR, RAPID_SUCCESSION, CONTRACT_INTERACTION), computes composite score
3. `analyzer.ts` — calls Venice API (`llama-3.3-70b`, private/no-retention inference) with anonymized tx summary → returns `{ riskScore, riskLevel, reasoning, recommendedAction, confidence }`
4. `onchain.ts` — calls `setRiskScore()` on-chain for escrowed txns
5. `erc8004.ts` — emits ERC-8004 reputation receipt (Protocol Labs prize track)
6. `alerts.ts` — sends Telegram alert if `recommendedAction !== 'ALLOW'`; includes inline keyboard buttons (✓ Approve, ✗ Cancel) wired to `contract.approve/cancel`

**Deduplication:** `processedTxHashes` is persisted to disk (`processed_hashes.json` alongside `seen_addresses.json`) to prevent duplicate alerts across Railway instance restarts.

**Venice integration:** `temperature: 0.1`, `include_venice_system_prompt: false`, `enable_web_search: 'off'`. Falls back to HIGH risk (score 75) if Venice is unreachable. The prompt passes only abstracted data (ETH value, recipient type, signal list) — no raw addresses or private data.

**Telegram callback handler:** `startTelegramCallbackHandler` polls `getUpdates` every 3s for `callback_query` events. Callback data format: `"approve:<txId>"` or `"cancel:<txId>"`. The agent wallet must be registered as a guardian on-chain via `addGuardian()` to execute these.

### Frontend (`frontend/src/`)

Next.js App Router. All interactive components are `'use client'`.

**Wallet integration:** wagmi v2 + viem. MetaMask connector with auto-switch to Base Sepolia on connect. `ConnectButton` (compact nav) and `ConnectModal` (full card for setup).

**Historical event loading:** `useWatchContractEvent` only catches live events. Historical events are loaded in `useEffect` using viem's `createPublicClient` + `getContractEvents` with a **9000-block window** (`block - 9000n`). The Base Sepolia RPC caps `eth_getLogs` at 10,000 blocks; 9000 is the safe limit.

**Pages:**
- `/` — Landing with "How it works" section
- `/setup` — Onboarding: connect wallet, read live contract state via `ContractStatusBadge`, shows forge deploy command in collapsible `<details>`
- `/dashboard` — Main guardian view with `ContractStats` bar (owner/guardian/threshold/txCount), `TransactionFeed`, `PendingApprovals`, `AlertHistory`
- `/demo` — Mock scam site "QuantumYield Finance" for demos; "Large Transfer" calls `propose()` (0.002 ETH, triggers escrow), "Small Transfer" calls `executeDirectly()` (0.0005 ETH, triggers alert)

**Key files:**
- `src/lib/contract.ts` — ABI (full viem format) + `CONTRACT_ADDRESS` (with `.trim()` to strip env var newlines)
- `src/lib/wagmi.ts` — wagmi config with Base Sepolia chain
- `src/components/ContractStats.tsx` — reads owner/threshold/txCount/isGuardian, shows wallet role badge
- `src/components/TransactionFeed.tsx` — shows APPROVED/CANCELLED status badges when `TransactionExecuted`/`TransactionCancelled` events are detected
- `src/components/AlertHistory.tsx` — shows Venice score ≥66 as high-risk entries; fetches `getPendingTx(txId)` to display amount/recipient

**tsconfig target:** ES2020 (required for BigInt literals in event loading code).

### ERC-8004 (`agent/src/erc8004.ts`)

- Identity Registry (Base Sepolia): `0x8004A818BFB912233c491871b3d84c89A494BD9e`
- Agent registers on startup if `AGENT_ID` env var is 0; set `AGENT_ID=2279` to skip
- ERC-8004 prevents self-feedback (agent owner cannot call `giveFeedback` for their own agent), so feedback is logged via `RiskScoreSet` events on GuardianWallet instead
- `agentUri` points to `docs/agent-registration.json` hosted on GitHub raw

---

## Known Gotchas

- **CONTRACT_ADDRESS trailing newline:** Always set env vars with `printf '%s' "0x..."` not `echo`. The frontend already has `.trim()` as defense.
- **eth_getLogs limit:** Base Sepolia RPC rejects ranges >10,000 blocks (returns 413). Keep historical load window at ≤9000 blocks.
- **Agent wallet must be a guardian:** For Telegram approve/cancel buttons to work, run `cast send <CONTRACT> "addGuardian(address,string)" <AGENT_WALLET> "@vigil"`.
- **ERC-8004 self-feedback restriction:** The agent wallet (owner of the ERC-8004 NFT) cannot call `giveFeedback` for itself. Reputation feedback requires a separate wallet with `FEEDBACK_SIGNER_KEY`.
- **Duplicate Telegram messages:** Can occur if two Railway instances start simultaneously with empty in-memory state before disk state loads. The disk-persisted `processed_hashes.json` prevents most cases.
