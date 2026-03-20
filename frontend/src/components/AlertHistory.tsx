'use client';

import { useWatchContractEvent } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

interface AlertItem { to: string; value: bigint; reason: string; hash: string; time: Date; }

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

export function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) { setLoading(false); return; }
    async function fetchHistory() {
      try {
        const block = await client.getBlockNumber();
        const fromBlock = block > 9000n ? block - 9000n : 0n;
        const logs = await client.getContractEvents({
          address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'SuspiciousActivityFlagged', fromBlock,
        });
        const historical: AlertItem[] = logs.map((log) => {
          const { to, value, reason } = log.args as any;
          return { to, value, reason, hash: log.transactionHash, time: new Date() };
        }).reverse();
        setAlerts(historical);
      } catch (e) {
        console.error('Failed to fetch alert history', e);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'SuspiciousActivityFlagged',
    onLogs: (logs) => {
      for (const log of logs) {
        const { to, value, reason } = log.args as any;
        setAlerts((prev) => [{ to, value, reason, hash: log.transactionHash, time: new Date() }, ...prev].slice(0, 20));
      }
    },
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
        <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center text-base">
          <span className="w-2 h-2 rounded-full bg-cyan-700 pulse-dot" />
        </div>
        <p className="section-label">Loading alerts…</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
        <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center text-base">◈</div>
        <p className="section-label">No flags recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="slide-in rounded-lg border border-red-500/25 bg-red-950/10 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 pulse-dot" />
              <span className="font-display text-xs font-semibold text-red-400 uppercase tracking-wider">Suspicious Activity</span>
            </div>
            <span className="font-mono text-[11px] text-slate-700">{alert.time.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="font-mono text-xs text-slate-500">{alert.to.slice(0, 10)}…</span>
            <span className="font-display text-base font-bold text-red-400">
              {parseFloat(formatEther(alert.value)).toFixed(6)}
              <span className="text-red-500/60 text-sm font-normal ml-1">ETH</span>
            </span>
          </div>
          <p className="font-body text-xs text-red-400/50 italic leading-relaxed">{alert.reason}</p>
        </div>
      ))}
    </div>
  );
}
