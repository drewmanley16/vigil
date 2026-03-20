'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { GUARDIAN_WALLET_ABI } from '@/lib/contract';
import { ConnectButton, ConnectModal } from '@/components/ConnectWallet';
import Link from 'next/link';

function Step({ n, title, subtitle, children }: {
  n: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center shrink-0">
          <span className="font-display text-xs font-bold text-cyan-400">{n}</span>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-white">{title}</h2>
          <p className="font-body text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="pl-12 space-y-3">{children}</div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block section-label mb-1.5">{children}</label>;
}

export default function SetupPage() {
  const { address, isConnected } = useAccount();
  const [contractAddress, setContractAddress] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [thresholdEth, setThresholdEth] = useState('1');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  return (
    <div className="min-h-screen bg-grid scanlines">

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070a10]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg">🛡️</span>
            <span className="font-display text-sm font-bold text-white tracking-wide">Vigil</span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white">Deploy Protection</h1>
          <p className="font-body text-sm text-slate-500 mt-1">
            Three steps to protect your family member's wallet.
          </p>
        </div>

        {/* Step 0 — Connect */}
        {!isConnected && (
          <Step n="00" title="Connect Wallet" subtitle="Connect MetaMask to interact with the contract">
            <ConnectModal />
          </Step>
        )}

        {/* Step 1 */}
        <Step n="01" title="Deploy GuardianWallet" subtitle="Run the forge script from the contracts directory">
          <pre className="rounded-lg bg-black/60 border border-white/5 p-4 text-[12px] text-emerald-400/80 overflow-x-auto leading-relaxed font-mono">
{`OWNER_ADDRESS=0x... \\
AGENT_ADDRESS=0x... \\
THRESHOLD_ETH=1 \\
PRIVATE_KEY=0x... \\
forge script script/Deploy.s.sol \\
  --rpc-url https://sepolia.base.org \\
  --broadcast --verify`}
          </pre>
          <div>
            <Label>Deployed contract address</Label>
            <input type="text" placeholder="0x…" value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)} className="input" />
          </div>
        </Step>

        {/* Step 2 */}
        <Step n="02" title="Add Guardian" subtitle="The guardian's wallet can approve or cancel high-risk transactions">
          <div>
            <Label>Guardian wallet address</Label>
            <input type="text" placeholder="0x…" value={guardianAddress}
              onChange={(e) => setGuardianAddress(e.target.value)} className="input" />
          </div>
          <div>
            <Label>Telegram handle (for alerts)</Label>
            <input type="text" placeholder="@username" value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)} className="input" />
          </div>
          <button disabled={busy || !contractAddress || !guardianAddress}
            onClick={() => writeContract({ address: contractAddress as `0x${string}`, abi: GUARDIAN_WALLET_ABI, functionName: 'addGuardian', args: [guardianAddress as `0x${string}`, telegramHandle] })}
            className="btn-primary w-full">{busy ? 'Confirming…' : 'Add Guardian →'}</button>
        </Step>

        {/* Step 3 */}
        <Step n="03" title="Set Safety Threshold" subtitle="Transactions above this amount are held in escrow until approved">
          <div className="flex items-center gap-3">
            <input type="number" min="0.01" step="0.1" value={thresholdEth}
              onChange={(e) => setThresholdEth(e.target.value)} className="input flex-1" />
            <span className="font-display text-sm font-bold text-cyan-400 w-10">ETH</span>
          </div>
          <button disabled={busy || !contractAddress}
            onClick={() => writeContract({ address: contractAddress as `0x${string}`, abi: GUARDIAN_WALLET_ABI, functionName: 'setThreshold', args: [parseEther(thresholdEth)] })}
            className="btn-primary w-full">{busy ? 'Confirming…' : 'Set Threshold →'}</button>
        </Step>

        {isSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-lg border border-emerald-500/25 bg-emerald-950/15">
            <span className="text-lg">✓</span>
            <p className="font-body text-sm text-emerald-400">Transaction confirmed — Vigil is now protecting this wallet.</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg border border-red-500/25 bg-red-950/15">
            <p className="font-body text-sm text-red-400">{error.message}</p>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/dashboard" className="font-body text-sm text-slate-500 hover:text-cyan-400 transition-colors">
            Open Guardian Console →
          </Link>
        </div>
      </div>
    </div>
  );
}
