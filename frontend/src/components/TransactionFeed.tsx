'use client';

import { useWatchContractEvent } from 'wagmi';
import { useState } from 'react';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { RiskBadge, riskLevelFromScore } from './RiskBadge';

interface FeedItem {
  type: 'proposed' | 'direct';
  txId?: bigint;
  to: string;
  value: bigint;
  timestamp: bigint;
  riskScore?: number;
  riskReason?: string;
  hash: string;
}

function truncate(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function TransactionFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const addItem = (item: FeedItem) =>
    setItems((prev) => [item, ...prev].slice(0, 50));

  const updateRisk = (txId: bigint, riskScore: number, riskReason: string) =>
    setItems((prev) =>
      prev.map((item) => item.txId === txId ? { ...item, riskScore, riskReason } : item)
    );

  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionProposed',
    onLogs: (logs) => { for (const log of logs) { const { txId, to, value, timestamp } = log.args as any; addItem({ type: 'proposed', txId, to, value, timestamp, hash: log.transactionHash }); } },
  });
  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'DirectTransfer',
    onLogs: (logs) => { for (const log of logs) { const { to, value, timestamp } = log.args as any; addItem({ type: 'direct', to, value, timestamp, hash: log.transactionHash }); } },
  });
  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet',
    onLogs: (logs) => { for (const log of logs) { const { txId, score, reason } = log.args as any; updateRisk(txId, Number(score), reason); } },
  });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
        <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-slate-700 pulse-dot" />
        </div>
        <p className="section-label">Watching for activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const level = item.riskScore !== undefined ? riskLevelFromScore(item.riskScore) : undefined;
        const accentClass =
          level === 'CRITICAL' ? 'border-red-500/30 bg-red-950/10' :
          level === 'HIGH'     ? 'border-orange-500/20' :
          level === 'MEDIUM'   ? 'border-yellow-500/15' :
                                 'border-white/5';
        return (
          <div key={item.hash + (item.txId?.toString() ?? '')}
            className={`slide-in rounded-lg border ${accentClass} bg-[#0d1117] p-3.5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-display text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {item.type === 'proposed' ? `🔒 Escrow #${item.txId}` : '⚡ Direct'}
                  </span>
                  {level && <RiskBadge level={level} score={item.riskScore} />}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-slate-500">{truncate(item.to)}</span>
                  <span className="font-display text-base font-bold text-white">
                    {parseFloat(formatEther(item.value)).toFixed(6)}
                    <span className="text-cyan-500/70 text-sm font-normal ml-1">ETH</span>
                  </span>
                </div>
                {item.riskReason && (
                  <p className="font-body text-xs text-slate-500 mt-1.5 leading-relaxed italic">{item.riskReason}</p>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-700 shrink-0 pt-0.5">
                {new Date(Number(item.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
