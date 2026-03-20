import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-grid bg-radial-cyan scanlines flex flex-col items-center px-4 relative overflow-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-xl w-full text-center pt-20 pb-24">

        {/* Icon */}
        <div className="mb-8 relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none"><path d="M18 3L4.5 9V18C4.5 25.5 10.35 32.4 18 34.5C25.65 32.4 31.5 25.5 31.5 18V9L18 3Z" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round"/><path d="M12 18L16 22L24 14" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
            { icon: '01', title: 'Smart Escrow', desc: 'Transactions above your threshold are held until a guardian approves' },
            { icon: '02', title: 'Private AI', desc: 'Venice API analyzes every transaction — zero data retention, ever' },
            { icon: '03', title: 'Live Alerts', desc: 'Guardians get Telegram alerts with AI risk scores in seconds' },
          ].map((f) => (
            <div key={f.title} className="card p-4 text-left hover:border-cyan-500/15 transition-colors">
              <div className="font-display text-xs font-bold text-cyan-500/50 mb-3 tracking-widest">{f.icon}</div>
              <p className="font-display text-sm font-semibold text-white mb-1">{f.title}</p>
              <p className="font-body text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
          <Link href="/setup" className="btn-primary glow-cyan">
            Add a Guardian →
          </Link>
          <Link href="/dashboard" className="btn-ghost">
            View Dashboard
          </Link>
        </div>

        {/* How it works */}
        <div className="text-left mb-12">
          <p className="section-label text-center mb-6">How it works</p>
          <div className="space-y-3">
            {[
              {
                n: '01',
                title: 'Deploy the GuardianWallet',
                desc: "A smart contract on Base acts as a proxy for your family member's wallet. Transactions above your threshold are automatically held in escrow.",
              },
              {
                n: '02',
                title: 'Vigil AI monitors every transaction',
                desc: "Our agent analyzes each transaction using Venice AI — a private, no-retention LLM. It scores risk based on recipient, amount, time, and behavior patterns.",
              },
              {
                n: '03',
                title: 'Guardians approve or cancel',
                desc: 'When a suspicious transaction is flagged, you get a Telegram alert with Venice\'s reasoning. Open the dashboard, review it, and approve or cancel with one click.',
              },
            ].map((step) => (
              <div key={step.n} className="card p-4 flex gap-4">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-display text-[10px] font-bold text-cyan-400">{step.n}</span>
                </div>
                <div>
                  <p className="font-display text-sm font-semibold text-white mb-1">{step.title}</p>
                  <p className="font-body text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {[
            { dot: 'bg-cyan-400', label: 'Live on Base Sepolia' },
            { dot: 'bg-emerald-400', label: 'Venice AI · No data retention' },
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
