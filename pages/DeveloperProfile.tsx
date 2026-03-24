import { ArrowLeft, Briefcase, Code, Copy, Heart, Instagram, Linkedin, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeveloperProfile() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 mb-4 border-b border-slate-800">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-800 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-slate-400" />
        </button>
        <h1 className="text-xl font-bold">Developer Profile</h1>
      </div>

      <div className="max-w-2xl mx-auto w-full space-y-6 pb-24">
        
        {/* Profile Card */}
        <div className="flex flex-col items-center py-6 text-center">
          <div className="w-32 h-32 rounded-full border-4 border-primary-500 bg-slate-800 mb-4 overflow-hidden shadow-[0_4px_16px_rgba(59,130,246,0.3)]">
            <img 
                src="/Images/developer_pfp.png" 
                alt="Harsh Jha" 
                className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-3xl font-bold mb-2">Harsh Jha</h2>
          
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
              <Briefcase className="w-4 h-4 text-primary-500" />
              <span className="text-slate-300 text-sm font-medium">Software Engineer</span>
            </div>
            <div className="text-primary-400 text-xs font-bold uppercase tracking-widest bg-primary-500/10 px-3 py-1 rounded-lg border border-primary-500/20">
              Certified Stack Overflow Archaeologist
            </div>
          </div>

          <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
            Full-stack developer who specializes in copy-pasting from Stack Overflow and then wondering why it doesn't work. I write code that works on my machine. If it doesn't work on yours, that's a "you" problem.
          </p>


        </div>

        {/* Tech Stack */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 tracking-widest mb-3 uppercase px-2">Tech Stack</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-4 py-3 border-b border-slate-800">
              <Code className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-200">React</span>
            </div>
            <div className="flex items-center gap-4 py-3 border-b border-slate-800">
              <Code className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-200">React Native</span>
            </div>
            <div className="flex items-center gap-4 py-3">
              <Code className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-200">Node.js</span>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 tracking-widest mb-3 uppercase px-2">Connect With Me</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <a 
              href="https://instagram.com/_harsh_jha_" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 py-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors rounded-lg px-2"
            >
              <Instagram className="w-6 h-6 text-pink-500" />
              <div className="flex-1">
                <span className="block font-medium text-slate-200">Follow on Instagram</span>
                <span className="block text-sm text-slate-500">@_harsh_jha_</span>
              </div>
            </a>
            <a 
              href="https://www.linkedin.com/notifications/?filter=all" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 py-3 hover:bg-slate-800/50 transition-colors rounded-lg px-2 mt-2"
            >
              <Linkedin className="w-6 h-6 text-blue-500" />
              <div className="flex-1">
                <span className="block font-medium text-slate-200">Connect on LinkedIn</span>
                <span className="block text-sm text-slate-500">Harsh Jha</span>
              </div>
            </a>
          </div>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 tracking-widest mb-3 uppercase px-2">Support Development</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
             <div className="flex items-center gap-4 py-3">
              <Smartphone className="w-6 h-6 text-primary-500" />
              <div className="flex-1">
                <span className="block font-medium text-slate-200">Support via UPI</span>
                <span className="block text-sm text-slate-400 font-mono mt-1">6394581304@ptsbi</span>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('6394581304@ptsbi');
                  alert('UPI ID copied to clipboard!');
                }}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700 group"
                title="Copy UPI ID"
              >
                <Copy className="w-4 h-4 text-slate-400 group-hover:text-primary-500" />
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800/50">
              <p className="text-xs text-slate-500 italic flex items-center gap-2">
                <Heart className="w-3 h-3 text-red-500/50" />
                Your support keeps the caffeine flowing and the bugs (mostly) away.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">Maintained with sarcasm by Harsh Jha</p>
        </div>

      </div>
    </div>
  );
}
