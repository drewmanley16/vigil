import Link from 'next/link';
import { LiveConsole } from '@/components/LiveConsole';
import { TelegramPreview } from '@/components/TelegramPreview';

export default function Home() {
  return (
    <main className="min-h-screen bg-grid bg-radial-cyan scanlines flex flex-col items-center px-4 relative overflow-hidden">

      {/* Ambient glows */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/6 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-40 left-1/4 w-64 h-64 bg-violet-600/4 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-600/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl w-full pt-16 pb-24">

        {/* ── HERO ─────────────────────────────────────── */}
        <div className="text-center mb-16 fade-up">

          {/* Icon */}
          <div className="mb-8 relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-cyan-500/8 border border-cyan-500/20 float glow-breathe">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 3L4.5 9V18C4.5 25.5 10.35 32.4 18 34.5C25.65 32.4 31.5 25.5 31.5 18V9L18 3Z" stroke="#06b6d4" strokeWidth="2.5" strokeLinejoin="round"/>
              <path d="M12 18L16 22L24 14" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="absolute inset-0 rounded-2xl bg-cyan-400/5 blur-md" />
          </div>

          {/* Title */}
          <h1 className="font-display text-6xl font-bold tracking-tight text-white mb-2">
            <span className="shimmer-text">Vigil</span>
          </h1>
          <p className="font-display text-sm font-medium tracking-[0.25em] text-cyan-500/50 uppercase mb-10">
            Guardian Protocol · Base Network · Venice AI
          </p>

          {/* Hero stat */}
          <div className="mb-10 inline-block rounded-xl border border-red-500/20 bg-red-950/10 px-8 py-5 critical-flash">
            <p className="font-display text-5xl font-bold text-red-400 tabular-nums text-glow-red">
              $28 billion
            </p>
            <p className="font-body text-sm text-red-400/50 mt-1">
              lost to elder financial fraud every year in the US
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/demo" className="btn-primary glow-intense">
              Watch It Intercept a Scam →
            </Link>
            <Link href="/dashboard" className="btn-ghost">
              Guardian Console
            </Link>
          </div>
        </div>

        {/* ── LIVE PREVIEW ─────────────────────────────── */}
        <div className="mb-16 fade-up-1">
          <p className="section-label text-center mb-6">Live system preview</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* Console */}
            <div>
              <p className="font-display text-xs font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
                Agent running on Railway
              </p>
              <LiveConsole />
              <p className="font-body text-[11px] text-slate-700 mt-2 text-center">
                Real-time event loop · Venice private inference · 15s poll cycle
              </p>
            </div>

            {/* Telegram preview */}
            <div>
              <p className="font-display text-xs font-semibold text-slate-500 mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot" />
                Guardian receives on Telegram
              </p>
              <TelegramPreview />
              <p className="font-body text-[11px] text-slate-700 mt-2 text-center">
                One-tap approve or cancel · executes on-chain · no app required
              </p>
            </div>

          </div>
        </div>

        {/* ── FEATURES ─────────────────────────────────── */}
        <div className="mb-16 fade-up-2">
          <p className="section-label text-center mb-6">How it works</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              {
                n: '01',
                title: 'Smart Escrow',
                desc: 'Transactions above your threshold are locked in the GuardianWallet smart contract — funds cannot leave without a guardian co-signature.',
                accent: 'border-cyan-500/15',
              },
              {
                n: '02',
                title: 'Private AI Analysis',
                desc: 'Venice AI analyzes every transaction with zero data retention. The prompt passes only abstracted data — no raw addresses or PII ever reach an LLM.',
                accent: 'border-violet-500/15',
              },
              {
                n: '03',
                title: 'Guardian Control',
                desc: 'Guardians get a Telegram alert with Venice\'s reasoning and one-tap approve or cancel buttons. The decision executes on-chain immediately.',
                accent: 'border-emerald-500/15',
              },
            ].map((f) => (
              <div key={f.n} className={`card card-gradient p-5 text-left hover:bg-[#131a24] transition-colors`}>
                <div className="font-display text-xs font-bold text-cyan-500/40 mb-4 tracking-widest">{f.n}</div>
                <p className="font-display text-sm font-semibold text-white mb-2">{f.title}</p>
                <p className="font-body text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Pipeline steps */}
          <div className="card p-5">
            <div className="flex flex-wrap items-center justify-center gap-2 text-center">
              {[
                { label: 'Transaction', sub: 'owner sends ETH', color: 'text-slate-400' },
                { arrow: true },
                { label: 'GuardianWallet', sub: 'escrowed on-chain', color: 'text-cyan-400' },
                { arrow: true },
                { label: 'Signal Detection', sub: '6 heuristics', color: 'text-yellow-400' },
                { arrow: true },
                { label: 'Venice AI', sub: 'private inference', color: 'text-violet-400' },
                { arrow: true },
                { label: 'Telegram Alert', sub: 'guardian notified', color: 'text-emerald-400' },
                { arrow: true },
                { label: 'On-Chain', sub: 'risk score written', color: 'text-cyan-400' },
              ].map((item, i) =>
                'arrow' in item ? (
                  <span key={i} className="text-slate-700 text-lg hidden sm:block">→</span>
                ) : (
                  <div key={i} className="px-3 py-2">
                    <p className={`font-display text-xs font-bold ${item.color}`}>{item.label}</p>
                    <p className="font-mono text-[10px] text-slate-700 mt-0.5">{item.sub}</p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* ── TRUST BADGES ─────────────────────────────── */}
        <div className="fade-up-3">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="badge badge-emerald">Live on Base Sepolia</span>
            <span className="badge badge-violet">Venice AI · Zero Retention</span>
            <span className="badge badge-cyan">ERC-8004 Agent #2279</span>
            <span className="badge badge-cyan">On-Chain Attestation</span>
            <span className="badge badge-cyan">Railway · 24/7</span>
            <span className="badge badge-violet">x402 Payment API</span>
          </div>
        </div>

      </div>
    </main>
  );
}
