'use client';

import { useWatchContractEvent } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
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
  status?: 'pending' | 'executed' | 'cancelled';
  hash: string;
}

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

function truncate(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function TransactionFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) { setLoading(false); return; }
    async function fetchHistory() {
      try {
        const block = await client.getBlockNumber();
        const fromBlock = block > 9000n ? block - 9000n : 0n;
        const [proposed, direct, riskSet, executed, cancelled] = await Promise.all([
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionProposed', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'DirectTransfer', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionExecuted', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionCancelled', fromBlock }),
        ]);

        const initial: FeedItem[] = [
          ...proposed.map((log) => { const { txId, to, value, timestamp } = log.args as any; return { type: 'proposed' as const, txId, to, value, timestamp, status: 'pending' as const, hash: log.transactionHash }; }),
          ...direct.map((log) => { const { to, value, timestamp } = log.args as any; return { type: 'direct' as const, to, value, timestamp, hash: log.transactionHash }; }),
        ].sort((a, b) => Number(b.timestamp) - Number(a.timestamp)).slice(0, 50);

        for (const log of riskSet) {
          const { txId, score, reason } = log.args as any;
          const item = initial.find((i) => i.txId === txId);
          if (item) { item.riskScore = Number(score); item.riskReason = reason; }
        }
        for (const log of executed) {
          const { txId } = log.args as any;
          const item = initial.find((i) => i.txId === txId);
          if (item) item.status = 'executed';
        }
        for (const log of cancelled) {
          const { txId } = log.args as any;
          const item = initial.find((i) => i.txId === txId);
          if (item) item.status = 'cancelled';
        }
        setItems(initial);
      } catch (e) {
        console.error('Failed to fetch history', e);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const addItem = (item: FeedItem) =>
    setItems((prev) => [item, ...prev].filter((x, i, arr) => arr.findIndex(y => y.hash === x.hash && y.txId === x.txId) === i).slice(0, 50));

  const updateRisk = (txId: bigint, riskScore: number, riskReason: string) =>
    setItems((prev) => prev.map((item) => item.txId === txId ? { ...item, riskScore, riskReason } : item));

  const updateStatus = (txId: bigint, status: 'executed' | 'cancelled') =>
    setItems((prev) => prev.map((item) => item.txId === txId ? { ...item, status } : item));

  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionProposed',
    onLogs: (logs) => { for (const log of logs) { const { txId, to, value, timestamp } = log.args as any; addItem({ type: 'proposed', txId, to, value, timestamp, status: 'pending', hash: log.transactionHash }); } },
  });
  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'DirectTransfer',
    onLogs: (logs) => { for (const log of logs) { const { to, value, timestamp } = log.args as any; addItem({ type: 'direct', to, value, timestamp, hash: log.transactionHash }); } },
  });
  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet',
    onLogs: (logs) => { for (const log of logs) { const { txId, score, reason } = log.args as any; updateRisk(txId, Number(score), reason); } },
  });
  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionExecuted',
    onLogs: (logs) => { for (const log of logs) { const { txId } = log.args as any; updateStatus(txId, 'executed'); } },
  });
  useWatchContractEvent({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'TransactionCancelled',
    onLogs: (logs) => { for (const log of logs) { const { txId } = log.args as any; updateStatus(txId, 'cancelled'); } },
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-slate-600">
        <span className="w-2 h-2 rounded-full bg-cyan-700 pulse-dot" />
        <p className="section-label">Loading transactions…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-10 h-10 rounded-xl border border-white/5 bg-white/2 flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-cyan-700/60 pulse-dot" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-slate-400 mb-1">Agent monitoring — no activity in window</p>
          <p className="font-body text-xs text-slate-600 max-w-xs">
            Vigil is scanning Base Sepolia every 15s. Transactions will appear here as the wallet owner sends ETH.
            Try the{' '}
            <a href="/demo" className="text-cyan-600 hover:text-cyan-400 transition-colors underline underline-offset-2">Demo page</a>{' '}
            to trigger a test transaction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const level = item.riskScore !== undefined ? riskLevelFromScore(item.riskScore) : undefined;
        const accentClass =
          item.status === 'executed'  ? 'border-emerald-500/20' :
          item.status === 'cancelled' ? 'border-white/5 opacity-50' :
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
                    {item.type === 'proposed' ? `ESCROW #${item.txId}` : 'DIRECT'}
                  </span>
                  {item.status === 'executed' && (
                    <span className="font-display text-[10px] font-bold text-emerald-400 border border-emerald-500/25 rounded-full px-2 py-0.5">APPROVED</span>
                  )}
                  {item.status === 'cancelled' && (
                    <span className="font-display text-[10px] font-bold text-slate-500 border border-white/8 rounded-full px-2 py-0.5">CANCELLED</span>
                  )}
                  {level && item.status !== 'cancelled' && <RiskBadge level={level} score={item.riskScore} />}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-slate-500">{truncate(item.to)}</span>
                  <span className="font-display text-base font-bold text-white">
                    {parseFloat(formatEther(item.value)).toFixed(6)}
                    <span className="text-cyan-500/70 text-sm font-normal ml-1">ETH</span>
                  </span>
                </div>
                {item.riskReason && item.status !== 'cancelled' && (
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
