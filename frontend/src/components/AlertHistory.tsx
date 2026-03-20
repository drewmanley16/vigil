'use client';

import { useWatchContractEvent, useReadContract } from 'wagmi';
import { useState, useEffect } from 'react';
import { formatEther, createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { riskLevelFromScore, RiskBadge } from './RiskBadge';

interface AlertItem {
  kind: 'flagged' | 'high-risk';
  txId?: bigint;
  to?: string;
  value?: bigint;
  reason: string;
  score?: number;
  hash: string;
  time: Date;
}

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

function HighRiskRow({ txId, reason, score, time }: { txId: bigint; reason: string; score: number; time: Date }) {
  const { data: tx } = useReadContract({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'getPendingTx', args: [txId],
  });
  const level = riskLevelFromScore(score);
  const { to, value } = (tx as any) ?? {};

  return (
    <div className="slide-in rounded-lg border border-orange-500/20 bg-orange-950/8 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 pulse-dot" />
          <span className="font-display text-xs font-semibold text-orange-400 uppercase tracking-wider">High Risk · Tx #{txId.toString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <RiskBadge level={level} score={score} />
          <span className="font-mono text-[11px] text-slate-700">{time.toLocaleTimeString()}</span>
        </div>
      </div>
      {to && value !== undefined && (
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-mono text-xs text-slate-500">{(to as string).slice(0, 10)}…</span>
          <span className="font-display text-base font-bold text-orange-400">
            {parseFloat(formatEther(value as bigint)).toFixed(6)}
            <span className="text-orange-500/60 text-sm font-normal ml-1">ETH</span>
          </span>
        </div>
      )}
      <p className="font-body text-xs text-slate-500 italic leading-relaxed">{reason}</p>
    </div>
  );
}

export function AlertHistory() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) { setLoading(false); return; }
    async function fetchHistory() {
      try {
        const block = await client.getBlockNumber();
        const fromBlock = block > 9000n ? block - 9000n : 0n;
        const [flagged, riskSet] = await Promise.all([
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'SuspiciousActivityFlagged', fromBlock }),
          client.getContractEvents({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet', fromBlock }),
        ]);

        const items: AlertItem[] = [
          ...flagged.map((log) => {
            const { to, value, reason } = log.args as any;
            return { kind: 'flagged' as const, to, value, reason, hash: log.transactionHash, time: new Date() };
          }),
          ...riskSet
            .filter((log) => Number((log.args as any).score) >= 66)
            .map((log) => {
              const { txId, score, reason } = log.args as any;
              return { kind: 'high-risk' as const, txId, score: Number(score), reason, hash: log.transactionHash, time: new Date() };
            }),
        ].reverse();
        setAlerts(items);
      } catch (e) {
        console.error('Failed to fetch alert history', e);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'SuspiciousActivityFlagged',
    onLogs: (logs) => {
      for (const log of logs) {
        const { to, value, reason } = log.args as any;
        setAlerts((prev) => [{ kind: 'flagged' as const, to, value, reason, hash: log.transactionHash, time: new Date() }, ...prev].slice(0, 20));
      }
    },
  });

  useWatchContractEvent({
    address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, eventName: 'RiskScoreSet',
    onLogs: (logs) => {
      for (const log of logs) {
        const { txId, score, reason } = log.args as any;
        if (Number(score) >= 66) {
          setAlerts((prev) => [{ kind: 'high-risk' as const, txId, score: Number(score), reason, hash: log.transactionHash, time: new Date() }, ...prev].slice(0, 20));
        }
      }
    },
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
        <span className="w-2 h-2 rounded-full bg-cyan-700 pulse-dot" />
        <p className="section-label">Loading alerts…</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
        <span className="w-2 h-2 rounded-full bg-slate-700" />
        <p className="section-label">No flags recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) =>
        alert.kind === 'high-risk' && alert.txId !== undefined ? (
          <HighRiskRow key={i} txId={alert.txId} reason={alert.reason} score={alert.score!} time={alert.time} />
        ) : (
          <div key={i} className="slide-in rounded-lg border border-red-500/25 bg-red-950/10 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 pulse-dot" />
                <span className="font-display text-xs font-semibold text-red-400 uppercase tracking-wider">Flagged</span>
              </div>
              <span className="font-mono text-[11px] text-slate-700">{alert.time.toLocaleTimeString()}</span>
            </div>
            {alert.to && alert.value !== undefined && (
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-mono text-xs text-slate-500">{(alert.to as string).slice(0, 10)}…</span>
                <span className="font-display text-base font-bold text-red-400">
                  {parseFloat(formatEther(alert.value as bigint)).toFixed(6)}
                  <span className="text-red-500/60 text-sm font-normal ml-1">ETH</span>
                </span>
              </div>
            )}
            <p className="font-body text-xs text-red-400/50 italic leading-relaxed">{alert.reason}</p>
          </div>
        )
      )}
    </div>
  );
}
