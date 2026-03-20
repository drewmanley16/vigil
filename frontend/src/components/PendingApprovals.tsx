'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { RiskBadge, riskLevelFromScore } from './RiskBadge';
import { useState } from 'react';

function TxCard({ txId, isGuardian }: { txId: number; isGuardian: boolean }) {
  const { data: tx } = useReadContract({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'getPendingTx', args: [BigInt(txId)],
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
  const isCritical = level === 'CRITICAL';

  return (
    <div className={`rounded-xl border p-4 slide-in ${isCritical ? 'border-red-500/30 bg-red-950/10 glow-red critical-flash' : 'card'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="font-display text-xs font-semibold text-slate-400">Tx #{txId}</span>
          {isCritical && (
            <span className="font-display text-[10px] font-bold tracking-widest text-red-400 uppercase bg-red-950/50 border border-red-500/30 rounded-full px-2 py-0.5">
              Action Required
            </span>
          )}
        </div>
        <RiskBadge level={level} score={score} />
      </div>

      {/* Data rows */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-3">
          <span className="section-label w-16 shrink-0">Amount</span>
          <span className="font-display text-xl font-bold text-white">
            {parseFloat(formatEther(value)).toFixed(6)}
            <span className="text-cyan-500/70 text-sm font-normal ml-1.5">ETH</span>
          </span>
        </div>
        <div className="flex items-start gap-3">
          <span className="section-label w-16 shrink-0 pt-0.5">To</span>
          <span className="font-mono text-xs text-slate-400 break-all leading-relaxed">{to}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="section-label w-16 shrink-0">Time</span>
          <span className="font-body text-xs text-slate-500">
            {new Date(Number(timestamp) * 1000).toLocaleString()}
          </span>
        </div>
        {riskReason && (
          <div className="pt-2 mt-2 border-t border-white/5">
            <p className="font-body text-xs text-slate-500 italic leading-relaxed">{riskReason}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      {isGuardian ? (
        <div className="flex gap-2">
          <button onClick={() => { setAction('approve'); writeContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'approve', args: [BigInt(txId)] }); }}
            disabled={isPending} className="btn-success flex-1 justify-center">
            {isPending && action === 'approve' ? '…' : '✓ Approve'}
          </button>
          <button onClick={() => { setAction('cancel'); writeContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'cancel', args: [BigInt(txId)] }); }}
            disabled={isPending} className="btn-danger flex-1 justify-center">
            {isPending && action === 'cancel' ? '…' : '✗ Cancel'}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 py-2 rounded-lg border border-white/5 bg-white/2">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
          <span className="font-body text-xs text-slate-600">Connect guardian wallet to act</span>
        </div>
      )}
    </div>
  );
}

export function PendingApprovals() {
  const { address } = useAccount();
  const { data: txCount } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'txCount' });
  const { data: isGuardian } = useReadContract({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'isGuardian',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  });

  const count = Number(txCount ?? 0);
  if (count === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
        <div className="w-8 h-8 rounded-full border border-slate-800 flex items-center justify-center text-lg">✓</div>
        <p className="section-label">Queue clear</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => <TxCard key={i} txId={i} isGuardian={!!isGuardian} />)}
    </div>
  );
}
