import { Battery, LogOut, Signal, Wifi } from 'lucide-react';
import React from 'react';

interface DeviceFrameProps {
  children: React.ReactNode;
}

const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Soft background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-600/10 blur-[140px]" />
      </div>

      {/* Landing Page Link - Floating Button */}
      <a 
        href="/"
        className="absolute top-8 left-8 z-50 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-white/[0.08] px-4 py-2 rounded-full text-slate-300 hover:text-white transition-all hover:bg-slate-800 group"
      >
        <LogOut className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to website</span>
      </a>

      {/* The Device Frame - Resized slightly smaller */}
      <div className="relative z-10 w-full max-w-[380px] aspect-[9/19.5] max-h-[820px] bg-slate-950 rounded-[3rem] border-[8px] border-slate-800 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06)] flex flex-col overflow-hidden group" style={{ willChange: 'transform' }}>
        
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

      {/* Get the app (desktop only) */}
      <div className="hidden xl:flex absolute left-12 bottom-12 items-center gap-5 max-w-sm rounded-[24px] border border-white/[0.08] bg-slate-900/60 p-4 pr-6 backdrop-blur-md">
        <img
          src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&margin=0&data=${encodeURIComponent("https://play.google.com/store/apps/details?id=com.orbyt.official.app")}`}
          alt="QR code for Orbyt on Google Play"
          className="h-20 w-20 rounded-xl bg-white p-1.5"
          draggable={false}
        />
        <div>
          <p className="font-display text-lg font-semibold text-white">Orbyt is better on your phone</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-400">Scan to get the Android app, with notifications when someone nearby waves.</p>
        </div>
      </div>
    </div>
  );
};

export default DeviceFrame;
