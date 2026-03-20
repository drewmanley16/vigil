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
        <span className="text-sm text-gray-600 font-mono">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
    >
      Connect Wallet
    </button>
  );
}

export default function DashboardPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-gray-900">
              🛡️ Vigil
            </Link>
            <span className="text-sm text-gray-400">Guardian Dashboard</span>
          </div>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {!isConnected && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-800">
            Connect your guardian wallet to approve or cancel pending transactions.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Approvals — most important, left column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔒</span> Pending Approvals
              </h2>
              <PendingApprovals />
            </div>
          </div>

          {/* Transaction Feed — middle + right */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📋</span> Transaction Feed
              </h2>
              <TransactionFeed />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🚨</span> Suspicious Activity Log
              </h2>
              <AlertHistory />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
