import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Mail, MapPin, Send, CheckCircle, Loader2 } from 'lucide-react';
import { safeBack } from "../util/safeBack";

const Contact: React.FC = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        setTimeout(() => setStatus('success'), 1500);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 h-16 flex items-center gap-4">
                <button onClick={() => safeBack(navigate, "/")} className="p-2 -ml-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-lg">Contact Us</h1>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-12 lg:py-24 grid lg:grid-cols-2 gap-16">
                <div className="space-y-12">
                    <header>
                        <h2 className="text-4xl lg:text-5xl font-black mb-6">Let&apos;s get in <br /><span className="text-primary-500">touch.</span></h2>
                        <p className="text-xl text-slate-400 leading-relaxed">
                            Have a question, feedback, or a partnership idea? We&apos;d love to hear from you. Our team typically responds within 24-48 hours.
                        </p>
                    </header>

                    <div className="space-y-8">
                        <div className="flex gap-6 group">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-primary-500/50 transition-colors">
                                <Mail className="w-6 h-6 text-primary-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-1">Email Us</h4>
                                <p className="text-slate-400 text-sm">support@orbyt.social</p>
                            </div>
                        </div>

                        <div className="flex gap-6 group">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-primary-500/50 transition-colors">
                                <MessageSquare className="w-6 h-6 text-primary-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-1">Live Chat</h4>
                                <p className="text-slate-400 text-sm">Available in-app for verified profiles.</p>
                            </div>
                        </div>

                        <div className="flex gap-6 group">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-primary-500/50 transition-colors">
                                <MapPin className="w-6 h-6 text-primary-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-1">Office</h4>
                                <p className="text-slate-400 text-sm">Silicon Valley, CA • Worldwide Remote</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900/50 p-8 md:p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl relative">
                    {status === 'success' ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center text-white shadow-2xl shadow-primary-500/30">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h3 className="text-3xl font-bold">Message Sent!</h3>
                            <p className="text-slate-400">Thanks for reaching out. We&apos;ll be in touch soon.</p>
                            <button onClick={() => setStatus('idle')} className="text-primary-500 font-bold hover:underline">Send another message</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase px-1">Name</label>
                                    <input required placeholder="Your Name" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary-500 transition-colors outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase px-1">Email</label>
                                    <input required type="email" placeholder="name@email.com" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary-500 transition-colors outline-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">Subject</label>
                                <select className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary-500 transition-colors outline-none appearance-none">
                                    <option>Account Support</option>
                                    <option>Feedback & Suggestions</option>
                                    <option>Report a Bug</option>
                                    <option>Partnerships</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase px-1">Message</label>
                                <textarea required rows={5} placeholder="How can we help?" className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary-500 transition-colors outline-none resize-none" />
                            </div>
                            <button 
                                disabled={status === 'submitting'}
                                className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-xl shadow-primary-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                {status === 'submitting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Send Message</>}
                            </button>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Contact;
