'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';

const client = createPublicClient({ chain: baseSepolia, transport: http('https://sepolia.base.org') });

interface ScorePoint {
  score: number;
  txId: number;
}

function riskColor(score: number): string {
  if (score >= 80) return '#f87171'; // red
  if (score >= 60) return '#fb923c'; // orange
  if (score >= 30) return '#fbbf24'; // yellow
  return '#34d399';                  // green
}

export function RiskSparkline() {
  const [points, setPoints] = useState<ScorePoint[]>([]);

  useEffect(() => {
    if (!CONTRACT_ADDRESS) return;
    async function fetch_() {
      try {
        const block = await client.getBlockNumber();
        const fromBlock = block > 9000n ? block - 9000n : 0n;
        const logs = await client.getContractEvents({
          address: CONTRACT_ADDRESS,
          abi: GUARDIAN_WALLET_ABI,
          eventName: 'RiskScoreSet',
          fromBlock,
        });
        const pts = logs.map(l => ({
          score: Number((l.args as { score: bigint }).score ?? 0n),
          txId: Number((l.args as { txId: bigint }).txId ?? 0n),
        })).slice(-12); // last 12 scored txns
        setPoints(pts);
      } catch { /* silent */ }
    }
    fetch_();
  }, []);

  if (points.length === 0) return null;

  const W = 200;
  const H = 40;
  const pad = 4;
  const barW = Math.max(4, (W - pad * 2) / points.length - 2);

  return (
    <div className="flex items-end gap-3">
      <span className="section-label shrink-0">Risk trend</span>
      <svg width={W} height={H} className="overflow-visible">
        {points.map((p, i) => {
          const barH = Math.max(3, (p.score / 100) * (H - pad));
          const x = pad + i * ((W - pad * 2) / points.length);
          const y = H - barH;
          return (
            <g key={i}>
              <rect
                x={x} y={y}
                width={barW} height={barH}
                rx={2}
                fill={riskColor(p.score)}
                opacity={0.75}
              />
              <title>Tx #{p.txId} · Score {p.score}/100</title>
            </g>
          );
        })}
      </svg>
      <span className="font-mono text-[10px] text-slate-700 shrink-0">last {points.length} scored</span>
    </div>
  );
}
