export default function Home() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-3">
          {/* Space reserved for custom Quantic icon */}
          <div className="w-10 h-10 flex items-center justify-center">
            {/* Your custom Quantic icon will go here */}
          </div>
          <span className="text-gray-800 font-bold text-2xl tracking-wide">Quantic</span>
        </div>

        <nav className="flex items-center gap-4">
          <button className="text-gray-700 px-6 py-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 hover:bg-white/40 transition-colors font-medium">
            Pricing
          </button>
          <button className="text-gray-700 px-6 py-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 hover:bg-white/40 transition-colors font-medium">
            Login
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <div className="inline-block bg-gray-600/20 rounded-full px-6 py-3 mb-10">
            <span className="text-gray-700 text-sm font-medium tracking-wide">AI newsletter for busy professionals</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-800 mb-8 leading-tight tracking-wide">
            Stay ahead with AI news<br />
            in your inbox.
          </h1>

          <p className="text-2xl text-gray-700 mb-10 max-w-3xl mx-auto leading-relaxed tracking-wide">
            Curated AI & software news, expert summaries, and<br />
            actionable insights. Weekly. Simple. Affordable.
          </p>

          <button className="bg-gray-800 text-white px-10 py-5 rounded-full font-bold text-xl hover:bg-gray-700 transition-colors shadow-lg tracking-wide">
            Start Free Trial
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center">
          <p className="text-gray-600 text-sm tracking-wide">© 2025 Quantic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}