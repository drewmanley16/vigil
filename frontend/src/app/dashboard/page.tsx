'use client';

import { useAccount } from 'wagmi';
import { TransactionFeed } from '@/components/TransactionFeed';
import { PendingApprovals } from '@/components/PendingApprovals';
import { AlertHistory } from '@/components/AlertHistory';
import { ConnectButton } from '@/components/ConnectWallet';
import { ContractStats } from '@/components/ContractStats';
import { ImpactStats } from '@/components/ImpactStats';
import { AgentStatus } from '@/components/AgentStatus';
import { GuardianReport } from '@/components/GuardianReport';
import { RiskSparkline } from '@/components/RiskSparkline';
import Link from 'next/link';

function Panel({
  title,
  accent,
  gradient,
  children,
}: {
  title: string;
  accent?: string;
  gradient?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-gradient flex flex-col">
      <div
        className={`h-0.5 rounded-t-xl bg-gradient-to-r ${
          gradient ?? 'from-cyan-500/0 via-cyan-500/40 to-cyan-500/0'
        }`}
      />
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
        <span className={`w-1.5 h-1.5 rounded-full ${accent ?? 'bg-cyan-500/60'}`} />
        <span className="font-display text-sm font-semibold text-slate-200">{title}</span>
      </div>
      <div className="p-4 flex-1 overflow-y-auto max-h-[600px]">
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-grid scanlines">

      {/* Top gradient accent line */}
      <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070a10]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M9 1.5L2.25 4.5V9C2.25 12.75 5.175 16.2 9 17.25C12.825 16.2 15.75 12.75 15.75 9V4.5L9 1.5Z"
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-display text-sm font-bold text-white tracking-wide">Vigil</span>
            </Link>
            <span className="w-px h-4 bg-white/10" />
            <span className="font-display text-xs text-slate-500 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              Guardian Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            <AgentStatus />
            <Link href="/demo" className="font-display text-xs text-slate-600 hover:text-yellow-400 transition-colors">
              Demo →
            </Link>
            <Link href="/setup" className="font-display text-xs text-slate-600 hover:text-cyan-400 transition-colors">
              Setup →
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Hero bar */}
      <div className="border-b border-white/5 bg-gradient-to-r from-transparent via-cyan-950/20 to-transparent">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="badge badge-emerald">Live on Base Sepolia</span>
            <span className="badge badge-violet">ERC-8004 Agent #2279</span>
            <span className="badge badge-cyan">x402 Enabled</span>
            <span className="badge badge-cyan">Venice AI · Private Inference</span>
          </div>
          <a
            href="https://vigil-agent-production.up.railway.app/stats"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-slate-700 hover:text-cyan-500 transition-colors"
          >
            Agent Stats ↗
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-5 py-6">

        {/* Stats bar */}
        <ContractStats />

        {/* Impact metrics */}
        <ImpactStats />

        {/* Risk trend sparkline */}
        <div className="mb-5 card-gradient px-5 py-3">
          <RiskSparkline />
        </div>

        {!isConnected && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-500/20 bg-yellow-950/10">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
            <p className="font-body text-sm text-yellow-400/80">
              Connect your guardian wallet to approve or cancel pending transactions.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left column */}
          <div className="space-y-5">
            <Panel title="Pending Approvals">
              <PendingApprovals />
            </Panel>
            <Panel
              title="Guardian Report"
              accent="bg-violet-500/60"
              gradient="from-violet-500/0 via-violet-500/40 to-violet-500/0"
            >
              <GuardianReport />
            </Panel>
          </div>

          {/* Right column */}
          <div className="lg:col-span-2 space-y-5">
            <Panel
              title="Transaction Feed"
              gradient="from-cyan-500/0 via-cyan-500/40 to-cyan-500/0"
            >
              <TransactionFeed />
            </Panel>
            <Panel
              title="Suspicious Activity Log"
              gradient="from-cyan-500/0 via-cyan-500/40 to-cyan-500/0"
            >
              <AlertHistory />
            </Panel>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge badge-emerald">Base Sepolia</span>
              <span className="badge badge-violet">ERC-8004 Agent #2279</span>
              <span className="badge badge-cyan">Venice AI · Zero Retention</span>
              <span className="badge badge-cyan">x402 Payment API</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://vigil-agent-production.up.railway.app/guardian-report"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-violet-600 hover:text-violet-400 transition-colors"
              >
                x402 Report ↗
              </a>
              <a
                href="https://vigil-agent-production.up.railway.app/agent-log"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-slate-700 hover:text-cyan-600 transition-colors"
              >
                Live Agent Log ↗
              </a>
              <a
                href="https://sepolia.basescan.org/address/0x38d5d97C29440C7a50cCc489928bC36392fb4981"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-slate-700 hover:text-cyan-600 transition-colors"
              >
                BaseScan ↗
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
