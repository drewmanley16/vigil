'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { ConnectButton, ConnectModal } from '@/components/ConnectWallet';
import Link from 'next/link';

const EXPLORER = `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`;

function Step({ n, title, subtitle, status, children }: {
  n: string; title: string; subtitle: string; status?: 'done' | 'active' | 'idle'; children: React.ReactNode;
}) {
  const borderClass = status === 'done' ? 'border-emerald-500/20' : status === 'active' ? 'border-cyan-500/20' : 'border-white/5';
  const numBg = status === 'done' ? 'bg-emerald-950/60 border-emerald-500/30' : status === 'active' ? 'bg-cyan-950/60 border-cyan-500/30' : 'bg-white/3 border-white/8';
  const numColor = status === 'done' ? 'text-emerald-400' : status === 'active' ? 'text-cyan-400' : 'text-slate-600';
  return (
    <div className={`rounded-xl border ${borderClass} bg-[#0d1117] p-5 space-y-4`}>
      <div className="flex items-start gap-4">
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${numBg}`}>
          {status === 'done'
            ? <span className="text-emerald-400 text-sm">✓</span>
            : <span className={`font-display text-xs font-bold ${numColor}`}>{n}</span>}
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

function ContractStatusBadge() {
  const { data: owner } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'owner', query: { enabled: !!CONTRACT_ADDRESS } });
  const { data: threshold } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'threshold', query: { enabled: !!CONTRACT_ADDRESS } });

  return (
    <div className="rounded-xl border border-emerald-500/15 bg-emerald-950/8 p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
        <span className="font-display text-xs font-semibold text-emerald-400">Contract Live</span>
      </div>
      <a href={EXPLORER} target="_blank" rel="noopener noreferrer"
        className="font-mono text-[11px] text-slate-500 hover:text-cyan-400 transition-colors">
        {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-8)} ↗
      </a>
      {threshold !== undefined && (
        <span className="font-display text-[11px] text-slate-500">
          Threshold: <span className="text-cyan-400">{parseFloat(formatEther(threshold as bigint)).toFixed(2)} ETH</span>
        </span>
      )}
      {owner && (
        <span className="font-display text-[11px] text-slate-500">
          Owner: <span className="font-mono text-slate-400">{(owner as string).slice(0, 8)}…</span>
        </span>
      )}
    </div>
  );
}

export default function SetupPage() {
  const { address, isConnected } = useAccount();
  const [guardianAddress, setGuardianAddress] = useState('');
  const [telegramHandle, setTelegramHandle] = useState('');
  const [thresholdEth, setThresholdEth] = useState('1');
  const [lastAction, setLastAction] = useState<'guardian' | 'threshold' | null>(null);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  // Auto-fill connected address as guardian
  const effectiveGuardian = guardianAddress || address || '';

  function handleAddGuardian() {
    setLastAction('guardian');
    writeContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'addGuardian', args: [effectiveGuardian as `0x${string}`, telegramHandle] });
  }

  function handleSetThreshold() {
    setLastAction('threshold');
    writeContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'setThreshold', args: [parseEther(thresholdEth)] });
  }

  return (
    <div className="min-h-screen bg-grid scanlines">

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#070a10]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 1.5L2.25 4.5V9C2.25 12.75 5.175 16.2 9 17.25C12.825 16.2 15.75 12.75 15.75 9V4.5L9 1.5Z" stroke="#06b6d4" strokeWidth="1.5" strokeLinejoin="round"/></svg>
            <span className="font-display text-sm font-bold text-white tracking-wide">Vigil</span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">

        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-white">Set Up Protection</h1>
          <p className="font-body text-sm text-slate-500 mt-1">
            Configure a guardian who can approve or cancel suspicious transactions.
          </p>
        </div>

        {/* Contract status */}
        {CONTRACT_ADDRESS && <ContractStatusBadge />}

        {/* Connect wallet */}
        {!isConnected && (
          <Step n="01" title="Connect Wallet" subtitle="Connect MetaMask to authorize changes" status="active">
            <ConnectModal />
          </Step>
        )}

        {/* Step 2 — Add Guardian */}
        <Step n="02" title="Add Guardian" subtitle="The guardian can approve or cancel high-risk transactions from their phone" status={isConnected ? 'active' : 'idle'}>
          <div>
            <Label>Guardian wallet address</Label>
            <input type="text" placeholder={address ?? '0x…'}
              value={guardianAddress}
              onChange={(e) => setGuardianAddress(e.target.value)}
              className="input" />
            {address && !guardianAddress && (
              <p className="font-body text-[11px] text-slate-600 mt-1.5">
                Leave blank to use your connected wallet ({address.slice(0, 8)}…)
              </p>
            )}
          </div>
          <div>
            <Label>Guardian's Telegram handle</Label>
            <input type="text" placeholder="@username" value={telegramHandle}
              onChange={(e) => setTelegramHandle(e.target.value)} className="input" />
            <p className="font-body text-[11px] text-slate-600 mt-1.5">
              Vigil sends real-time alerts here. Message <a href="https://t.me/vigil_guardian_bot" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-400">@vigil_guardian_bot</a> to activate.
            </p>
          </div>
          <button
            disabled={busy || !isConnected || !telegramHandle}
            onClick={handleAddGuardian}
            className="btn-primary w-full">
            {busy && lastAction === 'guardian' ? 'Confirming…' : 'Add Guardian →'}
          </button>
        </Step>

        {/* Step 3 — Threshold */}
        <Step n="03" title="Set Safety Threshold" subtitle="Transactions above this amount are held in escrow until a guardian approves" status={isConnected ? 'active' : 'idle'}>
          <div>
            <Label>Threshold amount</Label>
            <div className="flex items-center gap-3">
              <input type="number" min="0.01" step="0.1" value={thresholdEth}
                onChange={(e) => setThresholdEth(e.target.value)} className="input flex-1" />
              <span className="font-display text-sm font-bold text-cyan-400 w-10">ETH</span>
            </div>
            <p className="font-body text-[11px] text-slate-600 mt-1.5">
              Vigil's AI also monitors smaller transactions and sends alerts for anything suspicious.
            </p>
          </div>
          <button
            disabled={busy || !isConnected}
            onClick={handleSetThreshold}
            className="btn-primary w-full">
            {busy && lastAction === 'threshold' ? 'Confirming…' : 'Set Threshold →'}
          </button>
        </Step>

        {/* Success */}
        {isSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/25 bg-emerald-950/15">
            <span className="text-xl">✓</span>
            <div>
              <p className="font-display text-sm font-semibold text-emerald-400">Transaction confirmed</p>
              <p className="font-body text-xs text-emerald-400/60 mt-0.5">Vigil is now active and monitoring this wallet.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl border border-red-500/25 bg-red-950/15">
            <p className="font-display text-xs font-semibold text-red-400 mb-1">Transaction failed</p>
            <p className="font-body text-xs text-red-400/60">{error.message.split('\n')[0]}</p>
          </div>
        )}

        <div className="text-center pt-2">
          <Link href="/dashboard" className="btn-primary">
            Open Guardian Console →
          </Link>
        </div>

        {/* Advanced — deploy new contract */}
        <details className="group">
          <summary className="cursor-pointer font-display text-xs text-slate-600 hover:text-slate-400 transition-colors list-none flex items-center gap-2 pt-4">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            Deploy a new GuardianWallet contract
          </summary>
          <div className="mt-3 rounded-xl border border-white/5 bg-black/30 p-4">
            <p className="font-body text-xs text-slate-500 mb-3">Run this from the <code className="font-mono text-cyan-600/80">contracts/</code> directory:</p>
            <pre className="rounded-lg bg-black/60 border border-white/5 p-4 text-[11px] text-emerald-400/80 overflow-x-auto leading-relaxed font-mono">
{`OWNER_ADDRESS=0x... \\
AGENT_ADDRESS=0x... \\
THRESHOLD_ETH=1 \\
PRIVATE_KEY=0x... \\
forge script script/Deploy.s.sol \\
  --rpc-url https://sepolia.base.org \\
  --broadcast --verify`}
            </pre>
          </div>
        </details>

      </div>
    </div>
  );
}
