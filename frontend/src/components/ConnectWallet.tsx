'use client';

import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { useState } from 'react';

const MetaMaskFox = () => (
  <svg width="20" height="20" viewBox="0 0 318 318" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44.4 35.5L143.1 110.1L125.5 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M238.3 206.8L211.8 247.4L268.5 263L284.8 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M33.9 207.7L50.1 263L106.8 247.4L80.3 206.8L33.9 207.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M103.6 138.2L87.8 162.1L144.1 164.6L142.1 104.1L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M214.9 138.2L175.9 103.4L174.6 164.6L230.8 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4L140.6 230.9L111.4 208.1L106.8 247.4Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.9 230.9L211.8 247.4L207.1 208.1L177.9 230.9Z" fill="#E4761B" stroke="#E4761B" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function truncate(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Compact version for nav bars
export function ConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [open, setOpen] = useState(false);

  const wrongNetwork = isConnected && chain?.id !== baseSepolia.id;

  if (isConnected && wrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: baseSepolia.id })}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-950/20 text-orange-400 font-display text-xs font-semibold transition-all hover:border-orange-400/50"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
        Switch to Base Sepolia
      </button>
    );
  }

  if (isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-950/20 hover:border-emerald-500/40 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          <span className="font-mono text-xs text-emerald-400">{truncate(address!)}</span>
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-emerald-600">
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-44 card border border-white/10 shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/5">
              <p className="font-mono text-[11px] text-slate-500">{truncate(address!)}</p>
              <p className="font-display text-[11px] text-slate-600 mt-0.5">{chain?.name}</p>
            </div>
            <button
              onClick={() => { disconnect(); setOpen(false); }}
              className="w-full px-3 py-2.5 text-left font-display text-xs text-red-400 hover:bg-red-950/30 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not connected — show MetaMask button
  const mmConnector = connectors.find((c) => c.name === 'MetaMask') ?? connectors[0];

  return (
    <button
      onClick={() => connect({ connector: mmConnector, chainId: baseSepolia.id })}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/25 bg-[#1a1006] hover:border-orange-400/50 transition-all"
    >
      <MetaMaskFox />
      <span className="font-display text-xs font-semibold text-orange-300">Connect MetaMask</span>
    </button>
  );
}

// Full modal version for landing / setup
export function ConnectModal({ onConnected }: { onConnected?: () => void }) {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { switchChain } = useSwitchChain();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-emerald-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
        <span className="font-display text-sm font-semibold">Wallet connected</span>
      </div>
    );
  }

  const mmConnector = connectors.find((c) => c.name === 'MetaMask');
  const injectedConnector = connectors.find((c) => c.id === 'injected');

  const handleConnect = (connector: typeof mmConnector) => {
    if (!connector) return;
    connect(
      { connector, chainId: baseSepolia.id },
      { onSuccess: () => onConnected?.() }
    );
  };

  return (
    <div className="space-y-2">
      {mmConnector && (
        <button
          onClick={() => handleConnect(mmConnector)}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-orange-500/25 bg-[#1a1006] hover:border-orange-400/50 hover:bg-[#221508] transition-all disabled:opacity-50"
        >
          <MetaMaskFox />
          <div className="text-left">
            <p className="font-display text-sm font-semibold text-orange-300">MetaMask</p>
            <p className="font-body text-xs text-slate-500">Browser extension or mobile</p>
          </div>
          {isPending && <span className="ml-auto font-mono text-xs text-slate-600">connecting…</span>}
        </button>
      )}

      {injectedConnector && !mmConnector && (
        <button
          onClick={() => handleConnect(injectedConnector)}
          disabled={isPending}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-white/8 bg-white/3 hover:border-white/15 transition-all disabled:opacity-50"
        >
          <span className="text-xl">🦊</span>
          <div className="text-left">
            <p className="font-display text-sm font-semibold text-white">Browser Wallet</p>
            <p className="font-body text-xs text-slate-500">Any injected wallet</p>
          </div>
        </button>
      )}

      {!mmConnector && !injectedConnector && (
        <a
          href="https://metamask.io/download"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-orange-500/20 bg-[#1a1006] hover:border-orange-400/40 transition-all"
        >
          <MetaMaskFox />
          <div className="text-left">
            <p className="font-display text-sm font-semibold text-orange-300">Install MetaMask</p>
            <p className="font-body text-xs text-slate-500">Required to use Vigil</p>
          </div>
          <span className="ml-auto text-slate-600">↗</span>
        </a>
      )}
    </div>
  );
}
