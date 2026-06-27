import React, { useEffect, useState } from 'react';
import { X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserProfile } from '../types';

interface CollisionCardProps {
  profile: UserProfile;
  onDismiss: () => void;
}

const CollisionCard: React.FC<CollisionCardProps> = ({ profile, onDismiss }) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  // Animate in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleNavigate = () => {
    navigate(`/app/profile/${profile.uid}`);
    onDismiss();
  };

  return (
    <div
      className={`fixed bottom-24 left-4 right-4 z-[9500] transition-all duration-500 ease-out max-w-sm mx-auto ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
      }`}
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-red-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-red-950/30">
        {/* Glowing top bar */}
        <div className="h-0.5 bg-gradient-to-r from-red-600 via-orange-500 to-red-600" />

        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-500 text-[10px] font-black tracking-[0.2em] uppercase">
              Orbit Collision
            </span>
            <button
              onClick={onDismiss}
              className="ml-auto p-1 rounded-full hover:bg-slate-800 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleNavigate}
            className="w-full flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 rounded-2xl p-3 transition-colors border border-slate-700/50"
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-500/60">
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-700 flex items-center justify-center font-bold text-white">
                    {profile.displayName[0]}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-slate-900">
                <Zap className="w-2.5 h-2.5 text-white fill-current" />
              </div>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white font-bold text-sm truncate">{profile.displayName}</p>
              <p className="text-slate-400 text-[11px] truncate">
                Matching Vibe: {profile.liveStatusMode}
              </p>
            </div>
            <div className="text-slate-500 text-[10px] font-semibold shrink-0">View →</div>
          </button>

          <p className="text-center text-slate-600 text-[10px] mt-2 italic">
            Say hello before the window closes (5 min)
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollisionCard;
