import { Battery, LogOut, Signal, Wifi } from 'lucide-react';
import React from 'react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Dynamic Blurred Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div 
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary-500/10 blur-[100px] rounded-full animate-pulse" 
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        />
        <div 
          className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-500/10 blur-[130px] rounded-full animate-pulse decoration-5000" 
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        />
        <div 
          className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full animate-pulse decoration-3000" 
          style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
        />
      </div>

      {/* Landing Page Link - Floating Button */}
      <a 
        href="/"
        className="absolute top-8 left-8 z-50 flex items-center gap-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-xl text-slate-300 hover:text-white transition-all hover:bg-slate-800 group"
      >
        <LogOut className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
        <span className="text-xs font-bold uppercase tracking-widest">Back to Website</span>
      </a>

      {/* The Device Frame - Resized slightly smaller */}
      <div className="relative z-10 w-full max-w-[380px] aspect-[9/19.5] max-h-[820px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-[0_0_80px_rgba(0,0,0,0.5),0_0_0_2px_rgba(255,255,255,0.05)] flex flex-col overflow-hidden group transition-transform duration-500 hover:scale-[1.01]" style={{ willChange: 'transform' }}>
        
        {/* Antenna Lines & Buttons (Aesthetic) */}
        <div className="absolute -left-[10px] top-24 w-[2px] h-12 bg-slate-700 rounded-r-lg" />
        <div className="absolute -left-[10px] top-40 w-[2px] h-16 bg-slate-700 rounded-r-lg" />
        <div className="absolute -left-[10px] top-60 w-[2px] h-16 bg-slate-700 rounded-r-lg" />
        <div className="absolute -right-[10px] top-40 w-[2px] h-24 bg-slate-700 rounded-l-lg" />

        {/* Status Bar */}
        <div className="h-12 w-full flex items-center justify-between px-8 pt-2 relative z-50">
          <div className="text-xs font-bold text-white leading-none">9:41</div>
          
          {/* Dynamic Island */}
          <div className="absolute left-1/2 -translate-x-1/2 top-4 w-28 h-7 bg-black rounded-full flex items-center justify-center ring-1 ring-white/5 transition-all duration-300 group-hover:w-32">
             <div className="w-2 h-2 rounded-full bg-blue-500/20 blur-[2px]" />
          </div>

          <div className="flex items-center gap-1.5">
            <Signal className="w-3 h-3 text-white" />
            <Wifi className="w-3 h-3 text-white" />
            <Battery className="w-3 h-3 text-white rotate-90" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-slate-950">
          {children}
        </div>

        {/* Home Bar */}
        <div className="h-8 w-full flex items-center justify-center pb-2 bg-transparent absolute bottom-0 z-50 pointer-events-none">
          <div className="w-32 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* Floating Info (Desktop Only) */}
      <div className="hidden xl:flex absolute left-12 bottom-12 flex-col gap-2 max-w-sm">
        <h3 className="text-white font-black text-2xl tracking-tighter">Orbyt Core</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          Experience our high-fidelity mobile social discovery platform. Handcrafted for real connections.
        </p>
        <div className="flex gap-4 mt-2">
            <div className="flex flex-col">
                <span className="text-primary-500 font-bold text-lg leading-none">Starting</span>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Growth</span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800" />
            <div className="flex flex-col">
                <span className="text-white font-bold text-lg leading-none italic font-serif">100%</span>
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Real Tech</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceFrame;
