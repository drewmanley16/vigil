'use client';

import { useState } from 'react';
import { CONTRACT_ADDRESS } from '@/lib/contract';

interface ReportData {
  report: string;
  generatedAt: string;
  stats: {
    totalTxns: number;
    escrowedCount: number;
    directCount: number;
    approvedCount: number;
    cancelledCount: number;
    avgRisk: number;
    highRiskCount: number;
    criticalCount: number;
    totalEthEscrowed: string;
  };
}

export function GuardianReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractAddress: CONTRACT_ADDRESS }),
      });
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg">
          📊
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-slate-300 mb-1">Venice Guardian Report</p>
          <p className="font-body text-xs text-slate-600 max-w-xs">
            AI-synthesized summary of recent wallet activity — plain English for family guardians.
          </p>
        </div>
        {error && (
          <p className="font-mono text-xs text-red-400/70">{error}</p>
        )}
        <button onClick={generate} disabled={loading || !CONTRACT_ADDRESS} className="btn-primary">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-current pulse-dot" />
              Venice analyzing…
            </span>
          ) : (
            'Generate Report'
          )}
        </button>
        <p className="font-mono text-[10px] text-slate-700">Private inference · No data retention · Venice AI</p>
      </div>
    );
  }

  const s = data.stats;
  const riskColor = s.avgRisk >= 80 ? 'text-red-400' : s.avgRisk >= 60 ? 'text-orange-400' : s.avgRisk >= 30 ? 'text-yellow-400' : 'text-emerald-400';

  return (
    <div className="space-y-4">
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Monitored', value: s.totalTxns },
          { label: 'Blocked', value: s.cancelledCount, accent: s.cancelledCount > 0 ? 'text-emerald-400' : undefined },
          { label: 'Avg Risk', value: `${s.avgRisk}/100`, accent: riskColor },
        ].map((item) => (
          <div key={item.label} className="text-center p-2.5 rounded-lg bg-white/3 border border-white/5">
            <p className={`font-display text-lg font-bold ${item.accent ?? 'text-white'}`}>{item.value}</p>
            <p className="font-mono text-[10px] text-slate-600 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Report */}
      <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 pulse-dot" />
          <span className="section-label text-violet-500/60">Venice AI · Guardian Report</span>
          <span className="ml-auto font-mono text-[10px] text-slate-700">
            {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="font-body text-sm text-slate-300 leading-relaxed">{data.report}</p>
      </div>

      <button
        onClick={() => { setData(null); generate(); }}
        className="btn-ghost w-full justify-center text-xs"
      >
        Regenerate
      </button>
    </div>
  );
}
