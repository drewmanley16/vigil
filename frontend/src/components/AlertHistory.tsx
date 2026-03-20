'use client';

import { useWatchContractEvent } from 'wagmi';
import { useState } from 'react';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

interface AlertItem {
  to: string;
  value: bigint;
  reason: string;
  hash: string;
  time: Date;
}

export function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    eventName: 'SuspiciousActivityFlagged',
    onLogs: (logs) => {
      for (const log of logs) {
        const { to, value, reason } = log.args as any;
        setAlerts((prev) =>
          [{ to, value, reason, hash: log.transactionHash, time: new Date() }, ...prev].slice(0, 20)
        );
      }
    },
  });

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-slate-600">
        <div className="text-3xl mb-2 opacity-20">◈</div>
        <p className="text-xs tracking-widest uppercase">No flags recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="p-3 rounded border border-red-500/30 bg-red-950/10 font-mono glow-danger">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold tracking-widest text-red-400 uppercase">⚠ Suspicious Activity</span>
            <span className="text-[10px] text-slate-600">{alert.time.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-mono">{alert.to.slice(0, 10)}…</span>
            <span className="text-slate-600">·</span>
            <span className="text-red-400 font-bold">{parseFloat(formatEther(alert.value)).toFixed(6)} ETH</span>
          </div>
          <p className="text-[11px] text-red-400/60 mt-1 italic">{alert.reason}</p>
        </div>
      ))}
    </div>
  );
}
