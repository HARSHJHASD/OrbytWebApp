import React from 'react';
import { Plus } from 'lucide-react';

interface StoryBarProps {
  stories: any[];
  userProfile: any;
  onAddStory: () => void;
  onViewStory: (group: any) => void;
}

const StoryBar: React.FC<StoryBarProps> = ({ stories, userProfile, onAddStory, onViewStory }) => {
  return (
    <div className="no-scrollbar -mx-4 flex overflow-x-auto px-4 pb-1 pt-1 space-x-4">
      {/* My Story */}
      <div 
        className="flex flex-col items-center flex-shrink-0 cursor-pointer"
        onClick={onAddStory}
      >
        <div className="relative p-[2.5px] rounded-full bg-slate-700">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-950">
            {userProfile?.photoURL ? (
              <img src={userProfile.photoURL} className="w-full h-full object-cover" alt="My Story" />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
                {userProfile?.displayName?.[0] || 'M'}
              </div>
            )}
          </div>
          <div className="absolute bottom-1 right-1 bg-primary-500 rounded-full p-1 border-2 border-slate-950">
            <Plus size={10} className="text-white" />
          </div>
        </div>
        <span className="text-[11px] mt-1 text-slate-400 font-medium">My Moment</span>
      </div>

      {/* Others' Stories */}
      {stories.map((group) => (
        <div 
          key={group.uid}
          className="flex flex-col items-center flex-shrink-0 cursor-pointer"
          onClick={() => onViewStory(group)}
        >
          <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-primary-500 to-rose-400">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-950">
              {group.authorPhoto ? (
                <img src={group.authorPhoto} className="w-full h-full object-cover" alt={group.authorName} />
              ) : (
                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
                  {group.authorName?.[0]}
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] mt-1 text-slate-400 font-medium w-16 truncate text-center">
            {group.authorName}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StoryBar;
