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
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/20">
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="font-mono text-xs text-emerald-400">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
        </div>
        <button onClick={() => disconnect()}
          className="font-body text-xs text-slate-600 hover:text-slate-400 transition-colors">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => connect({ connector: injected() })} className="btn-primary">
      Connect Wallet
    </button>
  );
}

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
        <span className="text-base">{icon}</span>
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

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070a10]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-lg">🛡️</span>
              <span className="font-display text-sm font-bold text-white tracking-wide">Vigil</span>
            </Link>
            <span className="w-px h-4 bg-white/10" />
            <span className="font-display text-xs text-slate-500 font-medium">Guardian Console</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6">

        {!isConnected && (
          <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg border border-yellow-500/20 bg-yellow-950/10">
            <span className="text-sm">⚠️</span>
            <p className="font-body text-sm text-yellow-400/80">
              Connect your guardian wallet to approve or cancel pending transactions.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Pending — high priority */}
          <Panel title="Pending Approvals" icon="🔒">
            <PendingApprovals />
          </Panel>

          {/* Feed + alerts */}
          <div className="lg:col-span-2 space-y-5">
            <Panel title="Transaction Feed" icon="◈">
              <TransactionFeed />
            </Panel>
            <Panel title="Suspicious Activity Log" icon="⚠️">
              <AlertHistory />
            </Panel>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-[11px] text-slate-700">
            CONTRACT · 0x38d5d97C29440C7a50cCc489928bC36392fb4981
          </span>
          <span className="font-mono text-[11px] text-slate-700">
            ERC-8004 AGENT #2279 · BASE SEPOLIA
          </span>
        </div>
      </div>
    </div>
  );
}
