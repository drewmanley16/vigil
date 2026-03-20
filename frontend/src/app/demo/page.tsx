'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther } from 'viem';
import { GUARDIAN_WALLET_ABI, CONTRACT_ADDRESS } from '@/lib/contract';
import { ConnectButton } from '@/components/ConnectWallet';
import Link from 'next/link';

// Fake scammer address
const SCAMMER = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;
const ABOVE_THRESHOLD = '1.5'; // ETH — above the 1 ETH threshold
const BELOW_THRESHOLD = '0.001'; // ETH — triggers alert but goes through directly

function Countdown() {
  const [secs, setSecs] = useState(2 * 60 * 60 + 47 * 60 + 13); // fake urgency
  useEffect(() => {
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, '0');
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return (
    <div className="flex items-center gap-1 justify-center">
      {[h, m, s].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="font-mono text-2xl font-bold text-red-400 tabular-nums bg-red-950/40 border border-red-500/25 rounded-lg px-3 py-1.5">{v}</span>
          {i < 2 && <span className="font-mono text-xl text-red-500/60">:</span>}
        </span>
      ))}
    </div>
  );
}

export default function DemoPage() {
  const { address, isConnected } = useAccount();
  const { data: owner } = useReadContract({ address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'owner' });
  const isOwner = address && owner && (address as string).toLowerCase() === (owner as string).toLowerCase();

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  const [mode, setMode] = useState<'escrow' | 'direct'>('escrow');

  function triggerScam() {
    reset();
    if (mode === 'escrow') {
      writeContract({
        address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'propose',
        args: [SCAMMER, parseEther(ABOVE_THRESHOLD), '0x'],
        value: parseEther(ABOVE_THRESHOLD),
      });
    } else {
      writeContract({
        address: CONTRACT_ADDRESS, abi: GUARDIAN_WALLET_ABI, functionName: 'executeDirectly',
        args: [SCAMMER, parseEther(BELOW_THRESHOLD), '0x'],
        value: parseEther(BELOW_THRESHOLD),
      });
    }
  }

  return (
    <div className="min-h-screen scanlines" style={{ background: 'linear-gradient(135deg, #0a0015 0%, #06000f 50%, #000a08 100%)' }}>

      {/* Vigil demo banner */}
      <div className="sticky top-0 z-50 border-b border-cyan-500/20 bg-cyan-950/30 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-5 h-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
            <span className="font-display text-xs font-semibold text-cyan-400 tracking-wider uppercase">Vigil Demo — This is a simulated scam page</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-display text-xs text-cyan-400/70 hover:text-cyan-400 transition-colors">
              Watch it intercept →
            </Link>
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Fake scam site */}
      <div className="max-w-lg mx-auto px-5 py-12 text-center">

        {/* Fake logo */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-500/30 bg-yellow-950/20">
          <span className="text-yellow-400">◆</span>
          <span className="font-display text-sm font-bold text-yellow-300 tracking-wide">QuantumYield Finance</span>
          <span className="font-display text-[10px] text-yellow-600 border border-yellow-600/30 rounded px-1">PRO</span>
        </div>

        {/* Fake headline */}
        <h1 className="font-display text-3xl font-bold text-white mb-3 leading-tight">
          Your wallet has been<br />
          <span className="text-yellow-400">pre-selected</span> for Elite Staking
        </h1>
        <p className="font-body text-sm text-slate-400 mb-8 leading-relaxed">
          Our proprietary AI has identified your wallet as eligible for our exclusive
          liquidity protocol. <span className="text-yellow-400/80">Guaranteed 847% APY</span> — limited positions available.
        </p>

        {/* Fake stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: 'Total Locked', value: '$847M' },
            { label: 'Avg. Return', value: '847%' },
            { label: 'Active Wallets', value: '12,441' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-yellow-500/15 bg-yellow-950/10 p-3">
              <p className="font-display text-xl font-bold text-yellow-400">{s.value}</p>
              <p className="font-body text-[11px] text-slate-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Countdown */}
        <div className="mb-8 rounded-xl border border-red-500/20 bg-red-950/10 p-5">
          <p className="section-label mb-3 text-red-400/60">Offer expires in</p>
          <Countdown />
          <p className="font-body text-xs text-red-400/40 mt-3">Only 3 positions remaining at this rate</p>
        </div>

        {/* Mode toggle */}
        <div className="mb-5 flex rounded-xl border border-white/8 overflow-hidden">
          <button onClick={() => setMode('escrow')}
            className={`flex-1 py-2.5 font-display text-xs font-semibold transition-colors ${mode === 'escrow' ? 'bg-yellow-950/40 text-yellow-400 border-r border-yellow-500/20' : 'text-slate-600 hover:text-slate-400'}`}>
            🔒 Large Transfer (escrow demo)
          </button>
          <button onClick={() => setMode('direct')}
            className={`flex-1 py-2.5 font-display text-xs font-semibold transition-colors ${mode === 'direct' ? 'bg-slate-800/60 text-slate-300' : 'text-slate-600 hover:text-slate-400'}`}>
            ⚡ Small Transfer (alert demo)
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-white/5 bg-[#0d1117] p-4 text-left text-xs space-y-2">
          {mode === 'escrow' ? (
            <>
              <p className="font-display text-sm font-semibold text-yellow-400">Claim {ABOVE_THRESHOLD} ETH Yield Position</p>
              <p className="font-body text-slate-500">Sends <span className="text-yellow-400 font-semibold">{ABOVE_THRESHOLD} ETH</span> above the guardian threshold → <span className="text-cyan-400">locked in escrow</span> until guardian approves or cancels.</p>
              <p className="font-body text-slate-600">→ Vigil agent detects it, Venice AI scores it CRITICAL, Telegram alert fires, escrow holds funds.</p>
            </>
          ) : (
            <>
              <p className="font-display text-sm font-semibold text-slate-300">Claim {BELOW_THRESHOLD} ETH "Gas Rebate"</p>
              <p className="font-body text-slate-500">Sends <span className="text-white font-semibold">{BELOW_THRESHOLD} ETH</span> below threshold → goes through immediately but <span className="text-orange-400">triggers agent alert</span>.</p>
              <p className="font-body text-slate-600">→ Vigil flags first-time recipient + unusual pattern, guardian gets Telegram notification.</p>
            </>
          )}
        </div>

        {/* CTA */}
        {!isConnected ? (
          <div className="space-y-3">
            <div className="py-3 rounded-xl border border-white/8 bg-white/3 text-slate-500 font-display text-sm">
              Connect wallet to demo
            </div>
            <div className="flex justify-center"><ConnectButton /></div>
          </div>
        ) : !isOwner && mode === 'escrow' ? (
          <div className="rounded-xl border border-orange-500/20 bg-orange-950/10 p-4">
            <p className="font-display text-sm font-semibold text-orange-400 mb-1">Wrong wallet connected</p>
            <p className="font-body text-xs text-orange-400/60">
              <code className="font-mono text-orange-300/70">`propose()`</code> requires the contract owner wallet.
              Switch to the owner account in MetaMask, or use the "Small Transfer" mode instead.
            </p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-5">
              <p className="font-display text-lg font-bold text-emerald-400 mb-1">Transaction submitted ✓</p>
              <p className="font-body text-sm text-emerald-400/60">
                {mode === 'escrow'
                  ? 'Funds are now in escrow. Vigil is analyzing the transaction...'
                  : 'Transfer sent. Vigil agent is analyzing...'}
              </p>
            </div>
            <p className="font-body text-xs text-slate-600">
              Check your Telegram — an alert should arrive within 15 seconds.
            </p>
            <Link href="/dashboard"
              className="btn-primary w-full justify-center glow-cyan">
              Watch it in the Guardian Console →
            </Link>
          </div>
        ) : (
          <button
            onClick={triggerScam}
            disabled={busy}
            className={`w-full py-4 rounded-xl font-display text-base font-bold transition-all disabled:opacity-50 ${
              mode === 'escrow'
                ? 'bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/20 hover:border-yellow-400/60 hover:shadow-[0_0_30px_rgba(251,191,36,0.15)]'
                : 'bg-slate-500/10 border border-slate-500/30 text-slate-300 hover:bg-slate-500/20'
            }`}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-current pulse-dot" />
                {isPending ? 'Confirm in MetaMask…' : 'Waiting for block…'}
              </span>
            ) : mode === 'escrow' ? (
              `Claim ${ABOVE_THRESHOLD} ETH Yield →`
            ) : (
              `Claim ${BELOW_THRESHOLD} ETH Gas Rebate →`
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg border border-red-500/20 bg-red-950/10">
            <p className="font-body text-xs text-red-400/70">{error.message.split('\n')[0]}</p>
          </div>
        )}

        {/* Fake testimonials */}
        {!isSuccess && (
          <div className="mt-10 space-y-3">
            <p className="section-label">What investors say</p>
            {[
              { name: 'Michael T.', text: '"I turned 2 ETH into 18 ETH in just 3 weeks. Unbelievable."', stars: '★★★★★' },
              { name: 'Susan R.', text: '"My financial advisor told me not to, but I did it anyway. Best decision ever!"', stars: '★★★★★' },
            ].map((t) => (
              <div key={t.name} className="rounded-xl border border-white/5 bg-[#0d1117] p-4 text-left">
                <p className="font-body text-xs text-slate-500 italic mb-2">{t.text}</p>
                <div className="flex items-center justify-between">
                  <span className="font-display text-xs text-slate-600">— {t.name}</span>
                  <span className="text-yellow-500/60 text-xs">{t.stars}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Demo footer */}
      <div className="border-t border-cyan-500/10 bg-cyan-950/10 py-4 text-center">
        <p className="font-display text-xs text-cyan-400/50">
          🛡️ This page is a Vigil demo — real scam transactions are intercepted before funds leave the wallet.
        </p>
      </div>
    </div>
  );
}
