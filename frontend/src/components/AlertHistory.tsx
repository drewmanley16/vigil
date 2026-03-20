'use client';

import { useWatchContractEvent } from 'wagmi';
import { useState } from 'react';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

interface AlertItem { to: string; value: bigint; reason: string; hash: string; time: Date; }

export function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'SuspiciousActivityFlagged',
    onLogs: (logs) => {
      for (const log of logs) {
        const { to, value, reason } = log.args as any;
        setAlerts((prev) => [{ to, value, reason, hash: log.transactionHash, time: new Date() }, ...prev].slice(0, 20));
      }
    },
  });

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
