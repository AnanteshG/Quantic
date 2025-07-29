'use client';

import { useState, useEffect } from 'react';
import { useToast } from './components/toast';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Thank you for subscribing! You will receive AI news updates weekly.', 'success');
        (e.target as HTMLFormElement).reset();
      } else {
        showToast(data.error || 'Subscription failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      showToast('Something went wrong. Please try again.', 'error');
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex flex-col font-sans">
        {/* Static server-side content */}
        <header className="flex items-center justify-between p-3 sm:p-4 max-w-7xl mx-auto w-full relative z-10">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="QuanticDaily Logo"
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <span className="text-gray-800 font-bold text-base sm:text-lg tracking-wide">QuanticDaily</span>
          </div>

        </header>
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-4xl mx-auto relative z-10">
          <div className="mb-4 sm:mb-6">
            <div className="inline-block bg-gray-600/20 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 mb-4 sm:mb-6">
              <span className="text-gray-700 text-xs font-medium tracking-wide">AI newsletter for busy professionals</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-3 sm:mb-4 leading-tight tracking-wide">
              Stay ahead with AI news<br />
              in your inbox.
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed tracking-wide px-2">
              Curated AI & software news, expert summaries, and<br className="hidden sm:block" />
              <span className="sm:hidden"> </span>actionable insights. Weekly. Simple. Free.
            </p>
            <div className="flex flex-col gap-2 max-w-xs sm:max-w-sm mx-auto mb-3">
              <div className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-gray-300/50 bg-white/40 backdrop-blur-sm text-gray-800 font-medium tracking-wide text-xs sm:text-sm">
                Loading...
              </div>
            </div>

            {/* Trust indicators */}
            <div className="text-center max-w-xs sm:max-w-sm mx-auto px-2">
              <p className="text-gray-600 text-xs font-medium mb-1">
                ✓ Completely free • ✓ No spam • ✓ Unsubscribe anytime
              </p>
              <p className="text-gray-500 text-xs">
                Need to unsubscribe?{' '}
                <a
                  href="/unsubscribe"
                  className="text-gray-700 hover:text-gray-900 underline font-medium"
                >
                  Click here
                </a>
              </p>
            </div>
          </div>
        </main>
        <footer className="p-3 sm:p-4 max-w-7xl mx-auto w-full relative z-10">
          <div className="text-center">
            <p className="text-gray-600 text-xs tracking-wide">© 2025 QuanticDaily. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-3 sm:p-4 max-w-7xl mx-auto w-full relative z-10">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="QuanticDaily Logo"
            className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
          />
          <span className="text-gray-800 font-bold text-base sm:text-lg tracking-wide">QuanticDaily</span>
        </div>

        <nav className="flex items-center gap-4">
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-4xl mx-auto relative z-10">
        <div className="mb-4 sm:mb-6">
          <div className="inline-block bg-gray-600/20 rounded-full px-3 py-1 sm:px-4 sm:py-1.5 mb-4 sm:mb-6">
            <span className="text-gray-700 text-xs font-medium tracking-wide">AI newsletter for busy professionals</span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-gray-800 mb-3 sm:mb-4 leading-tight tracking-wide">
            Stay ahead with AI news<br />
            in your inbox.
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-gray-700 mb-4 sm:mb-6 max-w-2xl mx-auto leading-relaxed tracking-wide px-2">
            Curated AI & software news, expert summaries, and<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>actionable insights. Weekly. Simple. Free.
          </p>

          {/* Email Subscription Form */}
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2 max-w-xs sm:max-w-sm mx-auto mb-3">
            <input
              type="email"
              name="email"
              placeholder="Enter your email address"
              required
              className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-full border border-gray-300/50 bg-white/40 backdrop-blur-sm text-gray-800 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent font-medium tracking-wide text-xs sm:text-sm"
            />
            <button
              type="submit"
              className="w-full bg-gray-800 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-full font-bold text-xs sm:text-sm hover:bg-gray-700 transition-colors shadow-lg tracking-wide"
            >
              Subscribe
            </button>
          </form>

          {/* Trust indicators */}
          <div className="text-center max-w-xs sm:max-w-sm mx-auto px-2">
            <p className="text-gray-600 text-xs font-medium mb-1">
              ✓ Completely free • ✓ No spam • ✓ Unsubscribe anytime
            </p>
            <p className="text-gray-500 text-xs">
              Need to unsubscribe?{' '}
              <a
                href="/unsubscribe"
                className="text-gray-700 hover:text-gray-900 underline font-medium"
              >
                Click here
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-3 sm:p-4 max-w-7xl mx-auto w-full relative z-10">
        <div className="text-center">
          <p className="text-gray-600 text-xs tracking-wide">© 2025 QuanticDaily. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}