import React from 'react';
import { UserProfile } from '../types';
import { Sparkles } from 'lucide-react';

interface ProfileCompletenessProps {
  profile: UserProfile;
}

const ProfileCompleteness: React.FC<ProfileCompletenessProps> = ({ profile }) => {
  const calculateCompletion = () => {
    let score = 0;
    const weights = {
      photoURL: 20,
      bio: 20,
      interests: 20,
      jobRole: 15,
      instagramHandle: 10,
      dob: 15,
    };

    if (profile.photoURL) score += weights.photoURL;
    if (profile.bio) score += weights.bio;
    if (profile.interests && profile.interests.length >= 3) score += weights.interests;
    else if (profile.interests && profile.interests.length > 0) score += 10; // Partial credit
    if (profile.jobRole) score += weights.jobRole;
    if (profile.instagramHandle) score += weights.instagramHandle;
    if (profile.dob) score += weights.dob;

    return Math.min(score, 100);
  };

  const percentage = calculateCompletion();

  if (percentage === 100) return null;

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 mb-6 animate-fade-in relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <Sparkles className="w-12 h-12 text-primary-400" />
      </div>
      
      <div className="flex justify-between items-end mb-3">
        <div>
          <h4 className="text-white font-bold text-sm flex items-center gap-2">
            Profile Strength
            <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                {percentage}%
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {percentage < 50 ? "Complete your profile to stand out!" : "Almost there! Real people prefer complete profiles."}
          </p>
        </div>
      </div>

      <div className="relative h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary-600 to-primary-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(139,92,246,0.5)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
           {!profile.photoURL && <span className="text-[10px] bg-red-400/10 text-red-400 px-2 py-1 rounded-lg border border-red-500/20">Add Photo +20%</span>}
           {!profile.bio && <span className="text-[10px] bg-blue-400/10 text-blue-400 px-2 py-1 rounded-lg border border-blue-500/20">Add Bio +20%</span>}
           {(profile.interests?.length || 0) < 3 && <span className="text-[10px] bg-purple-400/10 text-purple-400 px-2 py-1 rounded-lg border border-purple-500/20">Add Interests +20%</span>}
           {!profile.jobRole && <span className="text-[10px] bg-green-400/10 text-green-400 px-2 py-1 rounded-lg border border-green-500/20">Add Role +15%</span>}
      </div>
    </div>
  );
};

export default ProfileCompleteness;
