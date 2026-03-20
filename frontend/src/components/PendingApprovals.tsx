'use client';

import { useReadContract, useWriteContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { RiskBadge, riskLevelFromScore } from './RiskBadge';
import { useState } from 'react';

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
  const isCritical = level === 'CRITICAL';

  const handleApprove = () => {
    setAction('approve');
    writeContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'approve', args: [BigInt(txId)] });
  };

  const handleCancel = () => {
    setAction('cancel');
    writeContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'cancel', args: [BigInt(txId)] });
  };

  return (
    <div className={`rounded border p-4 font-mono ${isCritical ? 'border-red-500/40 bg-red-950/10 glow-danger critical-flicker' : 'border-slate-700/50 bg-slate-950/60'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-widest text-slate-500 uppercase">Tx #{txId}</span>
        <RiskBadge level={level} score={score} />
      </div>

      <div className="space-y-1 mb-3 text-xs">
        <div className="flex items-start gap-2">
          <span className="text-slate-600 w-16 shrink-0">TO</span>
          <span className="text-slate-300 break-all font-mono text-[11px]">{to}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 w-16">AMOUNT</span>
          <span className="text-cyan-400 font-bold text-base">{parseFloat(formatEther(value)).toFixed(6)} ETH</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-600 w-16">TIME</span>
          <span className="text-slate-400">{new Date(Number(timestamp) * 1000).toLocaleString()}</span>
        </div>
        {riskReason && (
          <div className="pt-1 border-t border-slate-800 text-slate-500 italic text-[11px] leading-snug">
            {riskReason}
          </div>
        )}
      </div>

      {isGuardian ? (
        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 py-2 px-3 border border-emerald-500/30 hover:border-emerald-400/60 bg-emerald-950/30 hover:bg-emerald-950/50 text-emerald-400 text-xs font-bold tracking-widest uppercase rounded disabled:opacity-40 transition-all"
          >
            {isPending && action === 'approve' ? '…' : '✓ APPROVE'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex-1 py-2 px-3 border border-red-500/30 hover:border-red-400/60 bg-red-950/30 hover:bg-red-950/50 text-red-400 text-xs font-bold tracking-widest uppercase rounded disabled:opacity-40 transition-all"
          >
            {isPending && action === 'cancel' ? '…' : '✗ CANCEL'}
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-slate-600 text-center tracking-widest uppercase">Connect guardian wallet to act</p>
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
      <div className="flex flex-col items-center justify-center py-10 text-slate-600">
        <div className="text-3xl mb-2 opacity-20">◉</div>
        <p className="text-xs tracking-widest uppercase">Queue clear</p>
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
