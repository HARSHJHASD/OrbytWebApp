import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ArrowRight, Sparkles, Zap } from 'lucide-react';

const Blog: React.FC = () => {
    const navigate = useNavigate();

    const posts = [
        {
            category: "Product",
            title: "Introducing Orbyt: The Future of Live Interaction",
            excerpt: "Learn how we built the first social discovery engine that prioritizes real-world proximity while keeping security at its core.",
            date: "Mar 10, 2026",
            image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600&auto=format&fit=crop"
        },
        {
            category: "Community",
            title: "How to Make Friends in a New City Fast",
            excerpt: "Traveling can be lonely. Discover tips on using Orbyt's map and interest filters to find your community instantly.",
            date: "Mar 05, 2026",
            image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=600&auto=format&fit=crop"
        },
        {
            category: "Safety",
            title: "Our Commitment to a Secure Adult-Only Space",
            excerpt: "A deep dive into our verification systems and community reporting tools that keep Orbyt safe for everyone (18+).",
            date: "Feb 28, 2026",
            image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col font-sans">
            <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-6 h-16 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-lg">Orbyt Blog</h1>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-12 lg:py-24">
                <header className="mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                        <Sparkles className="w-3 h-3" />
                        <span>Latest News</span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black mb-6">Explore the Orbyt <br /><span className="text-slate-500 underline decoration-primary-500/50">Universe.</span></h2>
                    <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                        Insights, product updates, and stories from our community on mission to reconnect the world.
                    </p>
                </header>

                <div className="grid md:grid-cols-3 gap-8 mb-24">
                    {posts.map((post, idx) => (
                        <div key={idx} className="group cursor-pointer">
                            <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-slate-800 mb-6 bg-slate-900 shadow-xl group-hover:border-primary-500/30 transition-all">
                                <img 
                                    src={post.image} 
                                    alt={post.title} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-slate-950/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10">
                                        {post.category}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-slate-500 text-xs mb-3 font-medium">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{post.date}</span>
                            </div>
                            <h3 className="text-xl font-bold mb-3 group-hover:text-primary-400 transition-colors leading-snug">
                                {post.title}
                            </h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                {post.excerpt}
                            </p>
                            <div className="flex items-center gap-2 text-primary-500 font-bold text-sm">
                                Read More
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Newsletter */}
                <section className="bg-gradient-to-tr from-slate-900 to-slate-800 rounded-[3rem] p-8 md:p-16 border border-slate-700/50 text-center relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Zap className="w-8 h-8 text-primary-400" />
                        </div>
                        <h3 className="text-3xl font-bold">Stay in the loop</h3>
                        <p className="text-slate-400">Join 5,000+ others and get the latest from Orbyt delivered directly to your inbox every week.</p>
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                            <input 
                                type="email" 
                                placeholder="name@example.com" 
                                className="flex-1 bg-slate-950/50 border border-slate-700 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-primary-500 transition-colors"
                            />
                            <button className="bg-primary-500 hover:bg-primary-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-xl shadow-primary-500/20 active:scale-95">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Blog;
