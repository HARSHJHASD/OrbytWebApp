import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, MessageSquare, AlertTriangle, EyeOff, Ban } from 'lucide-react';
import { safeBack } from "../util/safeBack";

const Guidelines: React.FC = () => {
    const navigate = useNavigate();

    const sections = [
        {
            icon: Users,
            title: "Community Respect",
            content: "Treat all members with respect and kindness. Discrimination, hate speech, and harassment are strictly prohibited. We celebrate diversity and aim to create a welcoming environment for everyone."
        },
        {
            icon: Shield,
            title: "Safety First (Strictly 18+)",
            content: "Orbyt is an adult-only platform. Do not share content involving minors. Any account found to be operated by an underage user or sharing prohibited content will be permanently banned immediately."
        },
        {
            icon: MessageSquare,
            title: "Authentic Interactions",
            content: "Be yourself. Deceptive behavior, including impersonation or spamming, undermines the community trust. Verified profiles are encouraged to build a more transparent ecosystem."
        },
        {
            icon: EyeOff,
            title: "Privacy & Consent",
            content: "Respect the privacy of others. Do not share private information (doxing) or photos/videos of others without their explicit consent. Consent is mandatory for all interactions."
        },
        {
            icon: AlertTriangle,
            title: "Report Violations",
            content: "Help us keep Orbyt safe. If you see something that violates our guidelines, use the reporting tools. Our moderation team reviews all reports 24/7."
        },
        {
            icon: Ban,
            title: "Zero Tolerance Policy",
            content: "We have zero tolerance for illegal activities, violence promotion, or targeted harassment. Violating these core rules will result in an immediate and irrevocable ban."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center gap-4">
                    <button onClick={() => safeBack(navigate, "/")} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="font-bold text-lg">Community Guidelines</h1>
                </div>
            </nav>

            <main className="flex-1 max-w-4xl mx-auto px-6 py-12">
                <header className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 mb-6 font-bold text-primary-500">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black mb-4">Our Community Values</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Orbyt is built on the foundation of real-world connection and mutual respect. These guidelines are designed to ensure every user has a safe and positive experience.
                    </p>
                </header>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {sections.map((section, idx) => (
                        <div key={idx} className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-primary-500/30 transition-all">
                            <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center mb-6 border border-slate-800 text-primary-400">
                                <section.icon className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-3">{section.title}</h3>
                            <p className="text-slate-400 leading-relaxed text-sm">{section.content}</p>
                        </div>
                    ))}
                </div>

                <footer className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center">
                    <h4 className="font-bold mb-2">Updated: March 14, 2026</h4>
                    <p className="text-slate-500 text-sm">
                        By using Orbyt, you agree to follow these guidelines. Failure to comply may lead to restricted access or account termination.
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default Guidelines;
