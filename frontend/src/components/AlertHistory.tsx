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
          [
            { to, value, reason, hash: log.transactionHash, time: new Date() },
            ...prev,
          ].slice(0, 20)
        );
      }
    },
  });

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No suspicious activity flagged yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 uppercase">🚨 Suspicious Activity</span>
            <span className="text-xs text-gray-400">{alert.time.toLocaleTimeString()}</span>
          </div>
          <p className="text-sm mt-1">
            <span className="font-mono text-xs">{alert.to.slice(0, 10)}…</span>
            {' · '}
            <strong>{parseFloat(formatEther(alert.value)).toFixed(4)} ETH</strong>
          </p>
          <p className="text-xs text-red-600 mt-0.5 italic">{alert.reason}</p>
        </div>
      ))}
    </div>
  );
}
