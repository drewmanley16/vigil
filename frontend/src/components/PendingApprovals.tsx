'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { RiskBadge, riskLevelFromScore } from './RiskBadge';
import { useState } from 'react';

interface PendingTx {
  txId: number;
  to: string;
  value: bigint;
  timestamp: bigint;
  executed: boolean;
  cancelled: boolean;
  riskScore: bigint;
  riskReason: string;
  riskScoreSet: boolean;
}

function TxCard({ txId, isGuardian }: { txId: number; isGuardian: boolean }) {
  const { data: tx } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    functionName: 'getPendingTx',
    args: [BigInt(txId)],
  });

  const { writeContract, isPending } = useWriteContract();
  const [action, setAction] = useState<'approve' | 'cancel' | null>(null);

  if (!tx) return null;
  const { to, value, timestamp, executed, cancelled, riskScore, riskReason } = tx as unknown as {
    to: string; value: bigint; timestamp: bigint; executed: boolean;
    cancelled: boolean; riskScore: bigint; riskReason: string;
  };

  if (executed || cancelled) return null;

  const score = Number(riskScore);
  const level = riskLevelFromScore(score);

  const handleApprove = () => {
    setAction('approve');
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: GUARDIAN_WALLET_ABI,
      functionName: 'approve',
      args: [BigInt(txId)],
    });
  };

  const handleCancel = () => {
    setAction('cancel');
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: GUARDIAN_WALLET_ABI,
      functionName: 'cancel',
      args: [BigInt(txId)],
    });
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${level === 'CRITICAL' ? 'border-red-400 bg-red-50' : level === 'HIGH' ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-gray-700">Transaction #{txId}</span>
        <RiskBadge level={level} score={score} />
      </div>

      <div className="text-sm space-y-1 mb-3">
        <div><span className="text-gray-500">To:</span> <span className="font-mono text-xs">{to}</span></div>
        <div><span className="text-gray-500">Amount:</span> <span className="font-bold">{parseFloat(formatEther(value)).toFixed(4)} ETH</span></div>
        <div><span className="text-gray-500">At:</span> {new Date(Number(timestamp) * 1000).toLocaleString()}</div>
        {riskReason && <div className="text-xs italic text-gray-600 mt-1">{riskReason}</div>}
      </div>

      {isGuardian ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 py-2 px-3 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending && action === 'approve' ? 'Approving...' : '✓ Approve'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending && action === 'cancel' ? 'Cancelling...' : '✗ Cancel'}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">Connect guardian wallet to act</p>
      )}
    </div>
  );
}

export function PendingApprovals() {
  const { address } = useAccount();
  const { data: txCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    functionName: 'txCount',
  });

  const { data: isGuardian } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: GUARDIAN_WALLET_ABI,
    functionName: 'isGuardian',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  });

  const count = Number(txCount ?? 0);

  if (count === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No pending transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <TxCard key={i} txId={i} isGuardian={!!isGuardian} />
      ))}
    </div>
  );
}
