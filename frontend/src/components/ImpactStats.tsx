'use client';

import { useState, useEffect } from 'react';
import { formatEther } from 'viem';
import { CONTRACT_ADDRESS } from '@/lib/contract';
import { fetchAllEventsBatch } from '@/lib/events';

interface Stats {
  totalMonitored: number;
  threatsDetected: number;
  escrowedCount: number;
  cancelledCount: number;
  totalEthInterceptedWei: bigint;
  totalEthProtectedWei: bigint; // value of cancelled (returned) transactions
}

export function ImpactStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) return;

    async function compute() {
      try {
        const all = await fetchAllEventsBatch([
          'TransactionProposed',
          'DirectTransfer',
          'TransactionCancelled',
          'RiskScoreSet',
        ]);
        const proposed = all['TransactionProposed'];
        const direct = all['DirectTransfer'];
        const cancelled = all['TransactionCancelled'];
        const riskSet = all['RiskScoreSet'];

        const cancelledIds = new Set(
          cancelled.map((l) => (l.args as { txId?: bigint }).txId?.toString())
        );

        let totalEthIntercepted = 0n;
        let totalEthProtected = 0n;

        for (const log of proposed) {
          const { txId, value } = log.args as { txId: bigint; value: bigint };
          totalEthIntercepted += value ?? 0n;
          if (cancelledIds.has(txId?.toString())) {
            totalEthProtected += value ?? 0n;
          }
        }

        const highRiskCount = riskSet.filter((l) => Number((l.args as { score?: bigint }).score ?? 0n) >= 50).length;

        setStats({
          totalMonitored: proposed.length + direct.length,
          threatsDetected: highRiskCount,
          escrowedCount: proposed.length,
          cancelledCount: cancelled.length,
          totalEthInterceptedWei: totalEthIntercepted,
          totalEthProtectedWei: totalEthProtected,
        });
      } catch (e) {
        console.error('[ImpactStats] Failed to compute:', e);
      }
    }

    compute();
  }, []);

  const displayStats = stats ?? {
    totalMonitored: 0,
    threatsDetected: 0,
    escrowedCount: 0,
    cancelledCount: 0,
    totalEthInterceptedWei: 0n,
    totalEthProtectedWei: 0n,
  };

  const items = [
    {
      label: 'Txns Monitored',
      value: displayStats.totalMonitored.toString(),
      accent: 'text-slate-300',
    },
    {
      label: 'Threats Flagged',
      value: displayStats.threatsDetected.toString(),
      accent: displayStats.threatsDetected > 0 ? 'text-orange-400' : 'text-slate-600',
    },
    {
      label: 'ETH Escrowed',
      value: displayStats.totalEthInterceptedWei > 0n
        ? `${parseFloat(formatEther(displayStats.totalEthInterceptedWei)).toFixed(4)} ETH`
        : '0 ETH',
      accent: displayStats.totalEthInterceptedWei > 0n ? 'text-cyan-400' : 'text-slate-600',
    },
    {
      label: 'Txns Cancelled',
      value: displayStats.cancelledCount.toString(),
      accent: displayStats.cancelledCount > 0 ? 'text-emerald-400' : 'text-slate-600',
      sublabel: 'guardian blocked',
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className={`card px-4 py-3 text-center transition-opacity duration-500 ${!stats ? 'opacity-40' : ''}`}>
          <p className={`font-display text-xl font-bold tabular-nums ${item.accent}`}>{item.value}</p>
          <p className="font-body text-[11px] text-slate-600 mt-0.5">{item.label}</p>
          {item.sublabel && (
            <p className="font-mono text-[10px] text-slate-700">{item.sublabel}</p>
          )}
        </div>
      ))}
    </div>
  );
}
