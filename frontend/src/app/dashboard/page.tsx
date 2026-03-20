'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { TransactionFeed } from '@/components/TransactionFeed';
import { PendingApprovals } from '@/components/PendingApprovals';
import { AlertHistory } from '@/components/AlertHistory';
import Link from 'next/link';

function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 border border-cyan-500/20 rounded px-3 py-1.5 bg-cyan-950/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-cyan-400 font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="text-[10px] tracking-widest uppercase text-slate-600 hover:text-slate-400 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="px-4 py-2 border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 text-xs font-bold tracking-widest uppercase rounded transition-all glow"
    >
      Connect Wallet
    </button>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
      <span className="text-lg">{icon}</span>
      <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">{label}</span>
      <div className="flex-1 h-px bg-gradient-to-r from-slate-700/50 to-transparent" />
    </div>
  );
}

export default function DashboardPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen grid-bg">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-4 py-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-cyan-400 font-bold tracking-[0.2em] uppercase text-sm glow-text">
              🛡️ VIGIL
            </Link>
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-[10px] tracking-widest text-slate-500 uppercase">Guardian Console</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">

        {!isConnected && (
          <div className="mb-5 p-3 border border-yellow-500/20 rounded bg-yellow-950/10 text-xs text-yellow-400/80 tracking-wide">
            ⚠ Connect your guardian wallet to approve or cancel pending transactions
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Pending Approvals */}
          <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-4 glow">
            <SectionHeader icon="🔒" label="Pending Approvals" />
            <PendingApprovals />
          </div>

          {/* Right columns */}
          <div className="lg:col-span-2 space-y-5">

            <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-4">
              <SectionHeader icon="◈" label="Transaction Feed" />
              <TransactionFeed />
            </div>

            <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-4">
              <SectionHeader icon="⚠" label="Suspicious Activity Log" />
              <AlertHistory />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-700 font-mono">
          <span>CONTRACT: 0x38d5d97C29440C7a50cCc489928bC36392fb4981</span>
          <span>ERC-8004 AGENT #2279 · BASE SEPOLIA</span>
        </div>
      </div>
    </div>
  );
}
