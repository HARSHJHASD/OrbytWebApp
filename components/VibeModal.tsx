import React, { useState } from 'react';
import { X, Sparkles, Loader2, Zap } from 'lucide-react';
import { api } from '../services/api';
import { useUserLocation } from './LocationGuard';

interface VibeModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const RADIUS_OPTIONS = [2, 5, 10, 15, 25];

const VibeModal: React.FC<VibeModalProps> = ({ visible, onClose, userId }) => {
  const [selectedRadius, setSelectedRadius] = useState(5);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { location } = useUserLocation();

  if (!visible) return null;

  const handleSend = async () => {
    if (!location) return;
    setSending(true);
    try {
      await api.notifications.sendVibe(userId, selectedRadius, location.lat, location.lng);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 2000);
    } catch (e) {
      console.error('Failed to send vibe', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-slate-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-slate-800 shadow-2xl overflow-hidden z-10">
        {/* Top gradient bar */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Send a Vibe</h2>
                <p className="text-slate-400 text-xs">Ping everyone nearby anonymously</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Radius selector */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Broadcast Radius</p>
            <div className="flex gap-2">
              {RADIUS_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRadius(r)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    selectedRadius === r
                      ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/25'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="bg-slate-800/60 rounded-2xl p-4 mb-6 border border-slate-700/60">
            <p className="text-slate-300 text-sm leading-relaxed">
              A <span className="text-violet-400 font-bold">⚡ Vibe Wave</span> pings everyone
              within <span className="font-bold text-white">{selectedRadius}km</span> who has
              Orbyt open. They won't know who sent it—until they tap back.
            </p>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || sent || !location}
            className={`w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all ${
              sent
                ? 'bg-emerald-500 text-white'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 shadow-lg shadow-violet-500/25'
            } disabled:opacity-60`}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : sent ? (
              <>✓ Vibe Sent!</>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Launch Vibe Wave
              </>
            )}
          </button>

          {!location && (
            <p className="text-xs text-center text-amber-400 mt-3">
              Location access required to send vibes.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VibeModal;
