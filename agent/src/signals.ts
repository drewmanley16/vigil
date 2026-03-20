import { Transaction, SignalResult } from './types.js';

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
      triggered: tx.value > 0n, // threshold check happens upstream; if it's proposed it's above threshold
      weight: 0.5,
      description: 'Transaction value exceeds configured safety threshold',
    },
    {
      signal: 'UNUSUAL_HOUR',
      triggered: isUnusualHour(tx.timestamp),
      weight: 0.3,
      description: 'Transaction initiated between 2am–6am UTC',
    },
    {
      signal: 'RAPID_SUCCESSION',
      triggered: recentTxTimes.length >= RAPID_SUCCESSION_THRESHOLD,
      weight: 0.35,
      description: `More than ${RAPID_SUCCESSION_THRESHOLD} transactions in the last 10 minutes`,
    },
    {
      signal: 'CONTRACT_INTERACTION',
      triggered: tx.isContractInteraction,
      weight: 0.45,
      description: 'Transaction contains calldata (smart contract interaction)',
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
  const maxPossibleWeight = 1.5;
  return Math.min(100, Math.round((weightSum / maxPossibleWeight) * 100));
}

function isUnusualHour(unixTimestamp: number): boolean {
  const date = new Date(unixTimestamp * 1000);
  const utcHour = date.getUTCHours();
  return utcHour >= 2 && utcHour < 6;
}
