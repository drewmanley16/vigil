import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen grid-bg flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full text-center relative z-10">

        {/* Shield icon */}
        <div className="mb-8 relative inline-block">
          <div className="text-8xl glow-text">🛡️</div>
          <div className="absolute inset-0 rounded-full bg-cyan-400/5 blur-xl" />
        </div>

        {/* Wordmark */}
        <div className="mb-2">
          <h1 className="text-6xl font-bold tracking-[0.2em] text-cyan-400 glow-text uppercase">
            VIGIL
          </h1>
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <p className="text-xs tracking-[0.3em] text-cyan-500/70 uppercase">
              Guardian Protocol
            </p>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
        </div>

        {/* Stat callout */}
        <div className="my-10 border border-red-500/30 rounded-lg p-5 bg-red-950/20 glow-danger critical-flicker">
          <p className="text-4xl font-bold text-red-400 tabular-nums">$28,000,000,000</p>
          <p className="text-xs tracking-widest text-red-400/60 uppercase mt-1">
            Lost to elder financial fraud — annually
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            {
              icon: '🔒',
              title: 'Smart Escrow',
              desc: 'Large txns held until guardian co-signs',
            },
            {
              icon: '🤖',
              title: 'Private AI',
              desc: 'Venice API — zero data retention',
            },
            {
              icon: '⚡',
              title: 'Instant Alerts',
              desc: 'Telegram alerts within seconds',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="border border-cyan-500/10 rounded-lg p-4 bg-slate-950/50 glow hover:border-cyan-500/30 transition-colors"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="text-xs font-bold tracking-wider text-cyan-400 uppercase mb-1">{f.title}</p>
              <p className="text-xs text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/setup"
            className="px-8 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 rounded font-bold tracking-widest text-sm uppercase transition-all glow"
          >
            Deploy Protection
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-transparent hover:bg-slate-800/50 border border-slate-600/40 hover:border-slate-400 text-slate-300 rounded font-bold tracking-widest text-sm uppercase transition-all"
          >
            Guardian Dashboard
          </Link>
        </div>

        {/* Footer badges */}
        <div className="flex items-center justify-center gap-4 mt-12 flex-wrap">
          {['Base Network', 'Venice AI', 'ERC-8004 Verified'].map((badge) => (
            <span
              key={badge}
              className="text-[10px] tracking-widest uppercase text-slate-600 border border-slate-700/50 rounded px-2 py-1"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
