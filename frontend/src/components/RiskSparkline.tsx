'use client';

import { useState, useEffect } from 'react';
import { CONTRACT_ADDRESS } from '@/lib/contract';
import { fetchAllEvents } from '@/lib/events';

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
        const logs = await fetchAllEvents('RiskScoreSet');
        const pts = logs.map(l => ({
          score: Number((l.args as { score: bigint }).score ?? 0n),
          txId: Number((l.args as { txId: bigint }).txId ?? 0n),
        })).slice(-20); // last 20 scored txns
        setPoints(pts);
      } catch { /* silent */ }
    }
    fetch_();
  }, []);

  if (points.length === 0) {
    return (
      <div className="flex items-center gap-3 opacity-30">
        <span className="section-label shrink-0">Risk trend</span>
        <svg width={200} height={40} className="overflow-visible">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={4 + i * 24} y={36} width={10} height={3} rx={2} fill="#334155" opacity={0.5} />
          ))}
        </svg>
        <span className="font-mono text-[10px] text-slate-700 shrink-0">awaiting data</span>
      </div>
    );
  }

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
