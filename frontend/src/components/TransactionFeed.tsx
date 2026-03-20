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
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTime(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

export function TransactionFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);

  const addItem = (item: FeedItem) => {
    setItems((prev) => [item, ...prev].slice(0, 50));
  };

  const updateRisk = (txId: bigint, riskScore: number, riskReason: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.txId === txId ? { ...item, riskScore, riskReason } : item
      )
    );
  };

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    eventName: 'TransactionProposed',
    onLogs: (logs) => {
      for (const log of logs) {
        const { txId, to, value, timestamp } = log.args as any;
        addItem({ type: 'proposed', txId, to, value, timestamp, hash: log.transactionHash });
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    eventName: 'DirectTransfer',
    onLogs: (logs) => {
      for (const log of logs) {
        const { to, value, timestamp } = log.args as any;
        addItem({ type: 'direct', to, value, timestamp, hash: log.transactionHash });
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    eventName: 'RiskScoreSet',
    onLogs: (logs) => {
      for (const log of logs) {
        const { txId, score, reason } = log.args as any;
        updateRisk(txId, Number(score), reason);
      }
    },
  });

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">No transactions yet</p>
        <p className="text-sm mt-1">Watching for activity on the guardian wallet...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.hash + (item.txId?.toString() ?? '')}
          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500 uppercase">
                {item.type === 'proposed' ? `🔒 Escrowed #${item.txId}` : '⚡ Direct'}
              </span>
              {item.riskScore !== undefined && (
                <RiskBadge level={riskLevelFromScore(item.riskScore)} score={item.riskScore} />
              )}
            </div>
            <p className="text-sm mt-0.5">
              <span className="font-mono">{truncate(item.to)}</span>
              {' · '}
              <span className="font-semibold">{parseFloat(formatEther(item.value)).toFixed(4)} ETH</span>
            </p>
            {item.riskReason && (
              <p className="text-xs text-gray-500 mt-0.5 italic">{item.riskReason}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{formatTime(item.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
