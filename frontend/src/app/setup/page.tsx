'use client';

import { useState } from 'react';
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseEther } from 'viem';
import { GUARDIAN_WALLET_ABI } from '@/lib/contract';
import Link from 'next/link';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-slate-700/60 hover:border-slate-600 focus:border-cyan-500/50 focus:outline-none rounded bg-slate-900/50 px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-700 transition-colors";

export default function SetupPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();

  const [contractAddress, setContractAddress] = useState('');
  const [guardianAddress, setGuardianAddress] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [thresholdEth, setThresholdEth] = useState('1');

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const busy = isPending || isConfirming;

  return (
    <div className="min-h-screen grid-bg">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-cyan-400 font-bold tracking-[0.2em] uppercase text-sm glow-text">
            🛡️ VIGIL
          </Link>
          {isConnected ? (
            <div className="flex items-center gap-2 border border-cyan-500/20 rounded px-3 py-1.5 bg-cyan-950/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-cyan-400 font-mono">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
            </div>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="px-4 py-2 border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-xs font-bold tracking-widest uppercase rounded glow"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-widest text-cyan-400 uppercase glow-text">
            Deploy Protection
          </h1>
          <p className="text-xs text-slate-500 mt-1 tracking-wide">
            Configure Vigil to guard your family member's wallet.
          </p>
        </div>

        {/* Step 1 */}
        <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <span className="text-xs font-bold tracking-widest text-cyan-500 uppercase">Step 01</span>
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-500">Deploy GuardianWallet</span>
          </div>
          <p className="text-xs text-slate-500">Run from the <code className="text-cyan-400/70">vigil/contracts</code> directory:</p>
          <pre className="bg-black/60 border border-slate-800 rounded p-3 text-[11px] text-emerald-400/80 overflow-x-auto leading-relaxed">
{`OWNER_ADDRESS=0x... \\
AGENT_ADDRESS=0x... \\
THRESHOLD_ETH=1 \\
PRIVATE_KEY=0x... \\
forge script script/Deploy.s.sol \\
  --rpc-url https://sepolia.base.org \\
  --broadcast --verify`}
          </pre>
          <Field label="Deployed Contract Address">
            <input
              type="text"
              placeholder="0x…"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Step 2 */}
        <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <span className="text-xs font-bold tracking-widest text-cyan-500 uppercase">Step 02</span>
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-500">Add Guardian</span>
          </div>
          <Field label="Guardian Wallet Address">
            <input type="text" placeholder="0x…" value={guardianAddress}
              onChange={(e) => setGuardianAddress(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Guardian Telegram Handle">
            <input type="text" placeholder="@username" value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)} className={inputCls} />
          </Field>
          <button
            onClick={() => writeContract({ address: contractAddress as `0x${string}`, abi: GUARDIAN_WALLET_ABI, functionName: 'addGuardian', args: [guardianAddress as `0x${string}`, telegramHandle] })}
            disabled={busy || !contractAddress || !guardianAddress}
            className="w-full py-2 px-4 border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 text-xs font-bold tracking-widest uppercase rounded disabled:opacity-30 transition-all glow"
          >
            {busy ? '…' : 'Add Guardian →'}
          </button>
        </div>

        {/* Step 3 */}
        <div className="border border-slate-800 rounded-lg bg-slate-950/50 p-5 space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
            <span className="text-xs font-bold tracking-widest text-cyan-500 uppercase">Step 03</span>
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-xs text-slate-500">Set Safety Threshold</span>
          </div>
          <p className="text-xs text-slate-500">Transactions above this amount require guardian approval.</p>
          <div className="flex items-center gap-3">
            <input type="number" min="0.01" step="0.1" value={thresholdEth}
              onChange={(e) => setThresholdEth(e.target.value)}
              className={`flex-1 ${inputCls}`} />
            <span className="text-sm font-bold text-cyan-400 tracking-widest">ETH</span>
          </div>
          <button
            onClick={() => writeContract({ address: contractAddress as `0x${string}`, abi: GUARDIAN_WALLET_ABI, functionName: 'setThreshold', args: [parseEther(thresholdEth)] })}
            disabled={busy || !contractAddress}
            className="w-full py-2 px-4 border border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-950/20 hover:bg-cyan-950/40 text-cyan-400 text-xs font-bold tracking-widest uppercase rounded disabled:opacity-30 transition-all glow"
          >
            {busy ? '…' : 'Set Threshold →'}
          </button>
        </div>

        {isSuccess && (
          <div className="p-3 border border-emerald-500/30 rounded bg-emerald-950/20 text-xs text-emerald-400 tracking-wide">
            ✓ Transaction confirmed — Vigil is now active on this wallet.
          </div>
        )}

        {error && (
          <div className="p-3 border border-red-500/30 rounded bg-red-950/20 text-xs text-red-400">
            Error: {error.message}
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/dashboard" className="text-xs text-cyan-500/60 hover:text-cyan-400 tracking-widest uppercase transition-colors">
            Open Guardian Console →
          </Link>
        </div>
      </div>
    </div>
  );
}
