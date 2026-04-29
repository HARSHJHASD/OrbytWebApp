import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trash2, Mail, Info, Smartphone } from 'lucide-react';

const DeleteAccount: React.FC = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-md px-4 py-3 shadow-sm z-30 sticky top-0 border-b border-slate-800 flex items-center justify-between">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="font-bold text-white text-lg">Account Deletion</span>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 max-w-4xl mx-auto w-full p-6 md:p-10 space-y-8 animate-fade-in">
                <div className="text-center mb-8 mt-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Delete Your Account</h1>
                    <p className="text-slate-400 text-sm border-b border-slate-800 pb-6 inline-block">Request account and data removal</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Method 1: In-App */}
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="flex items-center gap-3 text-primary-400">
                            <Smartphone className="w-6 h-6" />
                            <h2 className="text-xl font-bold text-white">In-App Deletion</h2>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            The fastest way to delete your account and all associated data is directly through the Orbyt app.
                        </p>
                        <div className="space-y-3 pt-2">
                            <div className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">1</span>
                                <span className="text-slate-300">Open the Orbyt app on your device.</span>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">2</span>
                                <span className="text-slate-300">Go to your <strong>Profile</strong> and tap on <strong>Settings</strong>.</span>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">3</span>
                                <span className="text-slate-300">Scroll down and tap <strong>"Delete Account"</strong>.</span>
                            </div>
                            <div className="flex gap-3 text-sm">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">4</span>
                                <span className="text-slate-300">Confirm the deletion request to permanently remove your data.</span>
                            </div>
                        </div>
                    </div>

                    {/* Method 2: Email Request */}
                    <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <Mail className="w-6 h-6" />
                            <h2 className="text-xl font-bold text-white">Web/Email Request</h2>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            If you no longer have access to the app or cannot log in, you can request manual deletion via email.
                        </p>
                        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 border-dashed text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Send Email to</p>
                            <a href="mailto:orbytapp@gmail.com" className="text-primary-400 font-bold hover:underline break-all">
                                orbytapp@gmail.com
                            </a>
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-2xl flex gap-3">
                            <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Please send the request from your <strong>registered email address</strong>. Our team will process your request within 48-72 hours.
                            </p>
                        </div>
                    </div>
                </div>

                <section className="space-y-6 pt-6">
                    <h2 className="text-2xl font-bold text-white">Data Retention Policy</h2>
                    <div className="bg-slate-900/30 p-6 rounded-3xl border border-slate-800 space-y-4">
                        <p className="text-slate-300 text-sm leading-relaxed">
                            When you delete your account, the following data is permanently removed from our active servers:
                        </p>
                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {['Profile Information', 'Chat History', 'Personal Photos', 'Location History', 'Postings & Comments', 'Friend Connections'].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-slate-500 italic pt-2">
                            Note: Some information may be retained for a limited period if required by law or to ensure community safety (e.g., if an account was banned for safety violations).
                        </p>
                    </div>
                </section>

                <p className="text-center text-slate-600 text-xs pt-4 pb-10">© {new Date().getFullYear()} Orbyt Inc. All rights reserved.</p>
            </div>
        </div>
    );
};

export default DeleteAccount;
