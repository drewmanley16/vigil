import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-grid bg-radial-cyan scanlines flex flex-col items-center justify-center px-4 relative overflow-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-xl w-full text-center">

        {/* Icon */}
        <div className="mb-8 relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-4xl">🛡️</span>
          <div className="absolute inset-0 rounded-2xl bg-cyan-400/5 blur-md" />
        </div>

        {/* Title */}
        <h1 className="font-display text-5xl font-bold tracking-tight text-white mb-2">
          Vigil
        </h1>
        <p className="font-display text-sm font-medium tracking-[0.25em] text-cyan-500/60 uppercase mb-10">
          Guardian Protocol · Base Network
        </p>

        {/* Hero stat */}
        <div className="mb-10 rounded-xl border border-red-500/20 bg-red-950/10 px-6 py-5 critical-flash">
          <p className="font-display text-4xl font-bold text-red-400 tabular-nums text-glow-red">
            $28 billion
          </p>
          <p className="font-body text-sm text-red-400/50 mt-1">
            lost to elder financial fraud every year in the US
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { icon: '🔒', title: 'Smart Escrow', desc: 'Transactions above your threshold are held until a guardian approves' },
            { icon: '🤖', title: 'Private AI', desc: 'Venice API analyzes every transaction — zero data retention, ever' },
            { icon: '📲', title: 'Live Alerts', desc: 'Guardians get Telegram alerts with AI risk scores in seconds' },
          ].map((f) => (
            <div key={f.title} className="card p-4 text-left hover:border-cyan-500/15 transition-colors">
              <div className="text-2xl mb-3">{f.icon}</div>
              <p className="font-display text-sm font-semibold text-white mb-1">{f.title}</p>
              <p className="font-body text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/setup" className="btn-primary glow-cyan">
            Deploy Protection →
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            Guardian Dashboard
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-3 mt-10 flex-wrap">
          {[
            { dot: 'bg-cyan-400', label: 'Live on Base Sepolia' },
            { dot: 'bg-emerald-400', label: 'Venice AI' },
            { dot: 'bg-purple-400', label: 'ERC-8004 Agent #2279' },
          ].map((b) => (
            <div key={b.label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${b.dot}`} />
              <span className="font-mono text-[11px] text-slate-600">{b.label}</span>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}
