import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Cookie, Shield, Settings, Terminal } from 'lucide-react';

const CookiePolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 h-16 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-lg">Cookie Policy</h1>
            </nav>

            <main className="max-w-3xl mx-auto px-6 py-12 space-y-12">
                <header className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6 text-blue-500">
                        <Cookie className="w-8 h-8" />
                    </div>
                    <h2 className="text-4xl font-black mb-4">Cookies & Tracking</h2>
                    <p className="text-slate-400">Transparent information about how we use data to improve your Orbyt experience.</p>
                </header>

                <section className="space-y-6">
                    <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                            <Terminal className="w-5 h-5 text-blue-400" />
                            What are cookies?
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                            Cookies are small text files stored on your device when you visit a website. They help us remember your preferences, keep you signed in, and understand how you interact with our platform.
                        </p>
                    </div>

                    <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                            <Shield className="w-5 h-5 text-blue-400" />
                            How we use them
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <div>
                                    <p className="font-bold">Essential Cookies</p>
                                    <p className="text-sm text-slate-500">Necessary for the app to function (e.g., authentication, security).</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <div>
                                    <p className="font-bold">Analytics</p>
                                    <p className="text-sm text-slate-500">To understand app performance and fix bugs.</p>
                                </div>
                            </li>
                            <li className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                                <div>
                                    <p className="font-bold">Functional</p>
                                    <p className="text-sm text-slate-500">Remembers your settings and discovery preferences.</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-3">
                            <Settings className="w-5 h-5 text-blue-400" />
                            Managing Preferences
                        </h3>
                        <p className="text-slate-400 leading-relaxed">
                            You can control or delete cookies through your browser settings. However, disabling essential cookies may prevent you from using certain parts of Orbyt.
                        </p>
                    </div>
                </section>

                <footer className="text-center text-slate-600 text-sm border-t border-slate-800 pt-8">
                    <p>Last Updated: March 14, 2026</p>
                    <p className="mt-2">Contact support@orbyt.social for questions.</p>
                </footer>
            </main>
        </div>
    );
};

export default CookiePolicy;
