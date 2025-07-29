'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [mounted, setMounted] = useState(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Check if we have token and email in URL params for direct unsubscribe
        const token = searchParams.get('token');
        const emailParam = searchParams.get('email');

        if (token && emailParam) {
            handleTokenUnsubscribe(token, emailParam);
        }
    }, [searchParams, mounted]);

    const handleTokenUnsubscribe = async (token: string, email: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`);
            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setIsSuccess(true);
            } else {
                setMessage(data.error || 'Unsubscription failed. Please try again.');
                setIsSuccess(false);
            }
        } catch (error) {
            console.error('Unsubscription error:', error);
            setMessage('Something went wrong. Please try again.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailUnsubscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch('/api/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message);
                setIsSuccess(true);
                setEmail('');
            } else {
                setMessage(data.error || 'Unsubscription failed. Please try again.');
                setIsSuccess(false);
            }
        } catch (error) {
            console.error('Unsubscription error:', error);
            setMessage('Something went wrong. Please try again.');
            setIsSuccess(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between p-3 sm:p-4 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">Q</span>
                    </div>
                    <span className="text-gray-800 font-bold text-base sm:text-lg tracking-wide">QuanticDaily</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-lg mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 w-full">
                    <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                        Unsubscribe from QuanticDaily
                    </h1>

                    {message ? (
                        <div className={`p-3 rounded-xl mb-3 ${isSuccess ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <p className="text-xs sm:text-sm">{message}</p>
                            {isSuccess && (
                                <p className="text-xs mt-1 text-gray-600">
                                    We're sorry to see you go! You can always resubscribe anytime.
                                </p>
                            )}
                        </div>
                    ) : (
                        <>
                            <p className="text-xs sm:text-sm text-gray-600 mb-4">
                                We're sorry to see you go! Enter your email address below to unsubscribe from our newsletter.
                            </p>

                            <form onSubmit={handleEmailUnsubscribe} className="space-y-3">
                                <div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        required
                                        disabled={isLoading}
                                        className="w-full px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent font-medium text-xs sm:text-sm disabled:opacity-50"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-red-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Processing...' : 'Unsubscribe'}
                                </button>
                            </form>

                            <div className="mt-4 p-2 sm:p-2.5 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-600">
                                    <strong>Why are you unsubscribing?</strong><br />
                                    We'd love to improve! Send us your feedback at{' '}
                                    <a href="mailto:quanticdaily@gmail.com" className="text-blue-600 hover:underline">
                                        quanticdaily@gmail.com
                                    </a>
                                </p>
                            </div>
                        </>
                    )}

                    {isSuccess && (
                        <div className="mt-3">
                            <a
                                href="/"
                                className="inline-block bg-gray-800 text-white px-3 py-2 rounded-xl font-medium text-xs sm:text-sm hover:bg-gray-700 transition-colors"
                            >
                                Back to Homepage
                            </a>
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="p-3 sm:p-4 max-w-7xl mx-auto w-full">
                <div className="text-center">
                    <p className="text-gray-600 text-xs tracking-wide">© 2025 QuanticDaily. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense fallback={<UnsubscribeLoading />}>
            <UnsubscribeContent />
        </Suspense>
    );
}

function UnsubscribeLoading() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-gray-50">
            {/* Header */}
            <header className="flex items-center justify-between p-3 sm:p-4 max-w-7xl mx-auto w-full">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-xs sm:text-sm">Q</span>
                    </div>
                    <span className="text-gray-800 font-bold text-base sm:text-lg tracking-wide">QuanticDaily</span>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-lg mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-5 w-full">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-gray-600 text-xs sm:text-sm">Loading unsubscribe page...</p>
                </div>
            </main>

            {/* Footer */}
            <footer className="p-3 sm:p-4 max-w-7xl mx-auto w-full">
                <div className="text-center">
                    <p className="text-gray-600 text-xs tracking-wide">© 2025 QuanticDaily. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
