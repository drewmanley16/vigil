'use client';

import { useReadContract, useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

const EXPLORER = `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`;

export function ContractStats() {
  const { address } = useAccount();

  const { data: owner } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'owner' });
  const { data: threshold } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'threshold' });
  const { data: txCount } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'txCount' });
  const { data: isGuardian } = useReadContract({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'isGuardian',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  });

  const isOwner = address && owner && (address as string).toLowerCase() === (owner as string).toLowerCase();

  return (
    <div className="mb-5 rounded-xl border border-white/5 bg-[#0d1117] px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">

      {/* Contract link */}
      <a href={EXPLORER} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 group">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        <span className="font-mono text-[11px] text-slate-600 group-hover:text-cyan-400 transition-colors">
          {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)} ↗
        </span>
      </a>

      {/* Threshold */}
      {threshold !== undefined && (
        <div className="flex items-center gap-2">
          <span className="section-label">Threshold</span>
          <span className="font-display text-xs font-bold text-cyan-400">
            {parseFloat(formatEther(threshold as bigint)).toFixed(2)} ETH
          </span>
        </div>
      )}

      {/* Tx count */}
      {txCount !== undefined && (
        <div className="flex items-center gap-2">
          <span className="section-label">Total Txns</span>
          <span className="font-display text-xs font-bold text-white">{Number(txCount)}</span>
        </div>
      )}

      {/* Network */}
      <div className="flex items-center gap-2">
        <span className="section-label">Network</span>
        <span className="font-display text-xs text-slate-500">Base Sepolia</span>
      </div>

      {/* Wallet role — right side */}
      <div className="ml-auto">
        {!address ? (
          <span className="font-display text-[11px] text-slate-600">Not connected</span>
        ) : isOwner ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-500/25 bg-cyan-950/30 font-display text-[11px] font-semibold text-cyan-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Owner
          </span>
        ) : isGuardian ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/25 bg-emerald-950/30 font-display text-[11px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Guardian
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/8 font-display text-[11px] text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" /> Read-only
          </span>
        )}
      </div>
    </div>
  );
}
