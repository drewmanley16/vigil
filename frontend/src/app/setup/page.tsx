'use client';

import { useState } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther } from 'viem';
import { GUARDIAN_WALLET_ABI } from '@/lib/contract';
import Link from 'next/link';

// NOTE: In production this would deploy the contract via a factory.
// For the hackathon we guide users to deploy via forge script and then enter the address.
export default function SetupPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const [contractAddress, setContractAddress] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [thresholdEth, setThresholdEth] = useState('1');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleAddGuardian = () => {
    if (!contractAddress || !guardianAddress) return;
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: GUARDIAN_WALLET_ABI,
      functionName: 'addGuardian',
      args: [guardianAddress as `0x${string}`, telegramHandle],
    });
  };

  const handleSetThreshold = () => {
    if (!contractAddress) return;
    writeContract({
      address: contractAddress as `0x${string}`,
      abi: GUARDIAN_WALLET_ABI,
      functionName: 'setThreshold',
      args: [parseEther(thresholdEth)],
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-gray-900">🛡️ Vigil</Link>
          {isConnected ? (
            <span className="text-sm text-gray-600 font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Protection</h1>
          <p className="text-gray-500 mt-1">Configure Vigil to protect your family member's wallet.</p>
        </div>

        {/* Step 1: Deploy */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Step 1 — Deploy GuardianWallet Contract</h2>
          <p className="text-sm text-gray-500">
            Run this command from the <code className="bg-gray-100 px-1 rounded">vigil/contracts</code> directory:
          </p>
          <pre className="bg-gray-900 text-green-400 rounded-lg p-3 text-xs overflow-x-auto">
{`OWNER_ADDRESS=0x... \\
AGENT_ADDRESS=0x... \\
THRESHOLD_ETH=1 \\
PRIVATE_KEY=0x... \\
forge script script/Deploy.s.sol \\
  --rpc-url https://sepolia.base.org \\
  --broadcast --verify`}
          </pre>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract address (after deploy)</label>
            <input
              type="text"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {/* Step 2: Add Guardian */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Step 2 — Add Guardian</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian wallet address</label>
            <input
              type="text"
              placeholder="0x..."
              value={guardianAddress}
              onChange={(e) => setGuardianAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Telegram handle</label>
            <input
              type="text"
              placeholder="@username"
              value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleAddGuardian}
            disabled={isPending || isConfirming || !contractAddress || !guardianAddress}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending || isConfirming ? 'Confirming...' : 'Add Guardian'}
          </button>
        </div>

        {/* Step 3: Set Threshold */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Step 3 — Set Safety Threshold</h2>
          <p className="text-sm text-gray-500">Transactions above this amount require guardian approval.</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={thresholdEth}
              onChange={(e) => setThresholdEth(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-gray-500 font-medium">ETH</span>
          </div>
          <button
            onClick={handleSetThreshold}
            disabled={isPending || isConfirming || !contractAddress}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isPending || isConfirming ? 'Confirming...' : 'Set Threshold'}
          </button>
        </div>

        {isSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            Transaction confirmed! Vigil is now protecting this wallet.
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
            Error: {error.message}
          </div>
        )}

        <div className="text-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            Go to Guardian Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
