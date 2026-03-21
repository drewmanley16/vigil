'use client';

import { useState, useEffect } from 'react';
import { formatEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

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
        const block = await client.getBlockNumber();
        const fromBlock = block > 9000n ? block - 9000n : 0n;

        const [proposed, direct, cancelled] = await Promise.all([
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionProposed', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'DirectTransfer', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionCancelled', fromBlock }),
        ]);

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

        // RiskScoreSet events = threats detected by Venice (above threshold analysis)
        const riskSet = await client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet', fromBlock });
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

  if (!stats) return null;

  const items = [
    {
      label: 'Txns Monitored',
      value: stats.totalMonitored.toString(),
      accent: 'text-slate-300',
    },
    {
      label: 'Threats Flagged',
      value: stats.threatsDetected.toString(),
      accent: 'text-orange-400',
    },
    {
      label: 'ETH Escrowed',
      value: `${parseFloat(formatEther(stats.totalEthInterceptedWei)).toFixed(4)} ETH`,
      accent: 'text-cyan-400',
    },
    {
      label: 'Txns Cancelled',
      value: stats.cancelledCount.toString(),
      accent: 'text-emerald-400',
      sublabel: 'guardian blocked',
    },
  ];

  return (
    <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="card px-4 py-3 text-center">
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
