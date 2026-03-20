import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-950 via-indigo-900 to-purple-900 text-white px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo / Icon */}
        <div className="text-7xl mb-2">🛡️</div>

        {/* Headline */}
        <div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">Vigil</h1>
          <p className="text-xl text-blue-200 font-light">
            AI-powered fraud protection for elderly crypto users
          </p>
        </div>

        {/* Stat */}
        <div className="bg-white/10 backdrop-blur rounded-2xl px-6 py-4 border border-white/20">
          <p className="text-3xl font-bold text-red-400">$28 billion</p>
          <p className="text-sm text-blue-200 mt-1">lost to elder financial fraud every year in the US</p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          {[
            { icon: '🔒', title: 'Smart Escrow', desc: 'Large transactions are held until a guardian co-signs' },
            { icon: '🤖', title: 'Private AI', desc: 'Venice API analyzes each transaction — zero data retention' },
            { icon: '📱', title: 'Instant Alerts', desc: 'Guardians receive Telegram alerts with Venice risk scores' },
          ].map((step) => (
            <div key={step.title} className="bg-white/10 rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-2">{step.icon}</div>
              <h3 className="font-semibold mb-1">{step.title}</h3>
              <p className="text-sm text-blue-200">{step.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link
            href="/setup"
            className="px-8 py-3 bg-blue-500 hover:bg-blue-400 rounded-full font-semibold text-lg transition-colors"
          >
            Set Up Protection
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full font-semibold text-lg transition-colors"
          >
            Guardian Dashboard
          </Link>
        </div>

        {/* Built on */}
        <p className="text-xs text-blue-300 pt-4">
          Built on Base · Powered by Venice AI · ERC-8004 Verified Agent
        </p>
      </div>
    </main>
  );
}
