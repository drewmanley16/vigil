'use client';

import { useState, useEffect } from 'react';

interface AgentHealthResponse {
  status: string;
  transactionsMonitored?: number;
  threatsDetected?: number;
  agentId?: number;
  lastPollAt?: string;
  uptimeMs?: number;
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function AgentStatus() {
  const [health, setHealth] = useState<AgentHealthResponse | null>(null);
  const [error, setError] = useState(false);

  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;

  useEffect(() => {
    if (!agentUrl) return;

    async function check() {
      try {
        const res = await fetch(`${agentUrl}/stats`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error('not ok');
        const data = await res.json();
        setHealth(data);
        setError(false);
      } catch {
        setError(true);
      }
    }

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [agentUrl]);

  // No agent URL configured — show static "running on Railway" badge
  if (!agentUrl) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-950/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        <span className="font-display text-[11px] font-semibold text-emerald-400">Agent Live</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/20 bg-red-950/20">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        <span className="font-display text-[11px] font-semibold text-red-400">Agent Offline</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-700/40">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-600 pulse-dot" />
        <span className="font-display text-[11px] text-slate-600">Agent…</span>
      </div>
    );
  }

  const isOnline = health.status === 'ok';

  return (
    <div
      title={`Uptime: ${health.uptimeMs ? formatUptime(health.uptimeMs) : 'unknown'} · Threats: ${health.threatsDetected ?? 0} · Last poll: ${health.lastPollAt ? new Date(health.lastPollAt).toLocaleTimeString() : 'unknown'}`}
      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border cursor-default
        ${isOnline ? 'border-emerald-500/20 bg-emerald-950/20' : 'border-red-500/20 bg-red-950/20'}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 pulse-dot' : 'bg-red-500'}`} />
      <span className={`font-display text-[11px] font-semibold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
        {isOnline ? 'Agent Live' : 'Agent Offline'}
      </span>
      {isOnline && health.uptimeMs !== undefined && (
        <span className="font-mono text-[10px] text-emerald-700 ml-0.5">{formatUptime(health.uptimeMs)}</span>
      )}
    </div>
  );
}
