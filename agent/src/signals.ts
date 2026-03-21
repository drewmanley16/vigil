import { Transaction, SignalResult } from './types.js';
import { ethers } from 'ethers';

// Track rapid-succession transactions in memory
const recentTxTimes: number[] = [];
const RAPID_SUCCESSION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RAPID_SUCCESSION_THRESHOLD = 2;

export function detectSignals(tx: Transaction): SignalResult[] {
  const now = Date.now();

  // Clean up old timestamps
  const cutoff = now - RAPID_SUCCESSION_WINDOW_MS;
  while (recentTxTimes.length > 0 && recentTxTimes[0] < cutoff) {
    recentTxTimes.shift();
  }

  const signals: SignalResult[] = [
    {
      signal: 'FIRST_TIME_RECIPIENT',
      triggered: tx.isFirstTimeRecipient && tx.to !== null,
      weight: 0.4,
      description: 'Transaction to an address never seen before',
    },
    {
      signal: 'ABOVE_THRESHOLD',
      // Only triggers for proposed (escrowed) transactions — those exceeded the guardian threshold by definition
      triggered: tx.txId !== undefined,
      weight: 0.5,
      description: 'Transaction value exceeds configured safety threshold — funds held in escrow',
    },
    {
      signal: 'UNUSUAL_HOUR',
      triggered: isUnusualHour(tx.timestamp),
      weight: 0.3,
      description: 'Transaction initiated between 2am–6am UTC (common window for scam pressure tactics)',
    },
    {
      signal: 'RAPID_SUCCESSION',
      triggered: recentTxTimes.length >= RAPID_SUCCESSION_THRESHOLD,
      weight: 0.35,
      description: `${recentTxTimes.length + 1} transactions in the last 10 minutes (possible coercion or confusion)`,
    },
    {
      signal: 'CONTRACT_INTERACTION',
      triggered: tx.isContractInteraction,
      weight: 0.45,
      description: 'Sending ETH to a smart contract address, not a regular wallet',
    },
    {
      signal: 'ROUND_NUMBER_AMOUNT',
      triggered: isRoundNumber(tx.value),
      weight: 0.2,
      description: 'Suspiciously round ETH amount (common in social engineering scripts)',
    },
  ];

  // Record this transaction time for future rapid-succession checks
  recentTxTimes.push(tx.timestamp * 1000);

  return signals;
}

export function computeCompositeScore(signals: SignalResult[]): number {
  const triggered = signals.filter((s) => s.triggered);
  if (triggered.length === 0) return 0;

  const weightSum = triggered.reduce((acc, s) => acc + s.weight, 0);
  const maxPossibleWeight = 2.0; // updated for 6 signals
  return Math.min(100, Math.round((weightSum / maxPossibleWeight) * 100));
}

function isUnusualHour(unixTimestamp: number): boolean {
  const date = new Date(unixTimestamp * 1000);
  const utcHour = date.getUTCHours();
  return utcHour >= 2 && utcHour < 6;
}

// Detect "round" ETH amounts like 0.001, 0.01, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0
function isRoundNumber(valueWei: bigint): boolean {
  if (valueWei === 0n) return false;
  const eth = parseFloat(ethers.formatEther(valueWei));
  // Check if it's a clean multiple of a common round unit
  const roundUnits = [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0];
  for (const unit of roundUnits) {
    const ratio = eth / unit;
    if (Math.abs(ratio - Math.round(ratio)) < 0.0001) return true;
  }
  return false;
}
