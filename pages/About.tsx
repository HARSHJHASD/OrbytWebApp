import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Zap, Heart, Sparkles, MapPin } from 'lucide-react';
import { safeBack } from "../util/safeBack";

const About: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 h-16 flex items-center gap-4">
                <button onClick={() => safeBack(navigate, "/")} className="p-2 -ml-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-lg">About Orbyt</h1>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12 lg:py-24 space-y-24">
                <section className="text-center space-y-6">
                    <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-white">
                        Beyond the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-500">Digital Screen</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Orbyt was founded on a simple belief: the most meaningful moments happen in the physical world. Our mission is to bridge the gap between digital interaction and real-life connection.
                    </p>
                </section>

                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary-500/20 rounded-3xl blur-3xl transform rotate-3"></div>
                        <img 
                            src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=1000&auto=format&fit=crop" 
                            alt="Connection" 
                            className="relative rounded-3xl border border-slate-800 shadow-2xl grayscale hover:grayscale-0 transition-all duration-700"
                        />
                    </div>
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                <Sparkles className="w-6 h-6 text-primary-500" />
                                Our Vision
                            </h3>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                We want to make it effortless for people to find their tribe, explore their neighborhoods, and spark spontaneous conversations with those physically nearby.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                                <MapPin className="w-6 h-6 text-primary-500" />
                                Local First
                            </h3>
                            <p className="text-slate-400 text-lg leading-relaxed">
                                By focusing on proximity, we reduce the friction of meeting up. Orbyt isn't just a social network; it's a social discovery engine.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 border-y border-slate-800">
                    <div className="text-center">
                        <div className="text-3xl font-black text-white mb-2">Starting</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">From Scratch</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-white mb-2">0</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fake Data</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-white mb-2">Growing</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Neighborhoods</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-black text-white mb-2">100%</div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Honest Goal</div>
                    </div>
                </div>

                <section className="text-center pb-24">
                    <h3 className="text-3xl font-bold text-white mb-8">Join the Movement</h3>
                    <p className="text-slate-500 mb-10 max-w-xl mx-auto italic font-medium">
                        "The world is bigger than your feed. Go out and explore it."
                    </p>
                    <div className="flex justify-center gap-4">
                        <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary-500 transition-colors cursor-pointer">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary-500 transition-colors cursor-pointer">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div className="w-12 h-12 rounded-full border border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary-500 transition-colors cursor-pointer">
                            <Heart className="w-5 h-5" />
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default About;
