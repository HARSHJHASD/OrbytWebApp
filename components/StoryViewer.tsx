import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface StoryViewerProps {
  group: any;
  onClose: () => void;
  currentUserId?: string;
}

const StoryViewer: React.FC<StoryViewerProps> = ({ group, onClose, currentUserId }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress === 100) {
          if (currentIdx < group.stories.length - 1) {
            setCurrentIdx(currentIdx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return Math.min(oldProgress + 1, 100);
      });
    }, 50); // 5 seconds per story

    return () => clearInterval(timer);
  }, [currentIdx, group, onClose]);

  const currentStory = group.stories[currentIdx];

  useEffect(() => {
    if (currentStory && currentUserId && currentStory.uid !== currentUserId) {
      api.util.viewStory(currentStory._id, currentUserId).catch(console.error);
    }
  }, [currentStory, currentUserId]);

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this moment?")) return;
    try {
      await api.util.deleteStory(currentStory._id, currentUserId!);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to delete story");
    }
  };

  const goNext = () => {
    if (currentIdx < group.stories.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goBack = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center backdrop-blur-2xl">
      <div className="relative w-full max-w-md aspect-[9/16] bg-[#030B18] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/5">
        {/* Progress Bars */}
        <div className="absolute top-4 left-0 right-0 z-10 flex gap-1 px-4">
          {group.stories.map((_: any, i: number) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75 ease-linear"
                style={{ 
                  width: i === currentIdx ? `${progress}%` : i < currentIdx ? '100%' : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-8 left-0 right-0 z-10 flex items-center px-4">
          <div className="flex items-center gap-3">
            <img src={group.authorPhoto} className="w-9 h-9 rounded-full border border-white/20" alt="" />
            <div>
              <p className="text-white text-sm font-bold shadow-sm">{group.authorName}</p>
              <p className="text-white/60 text-[10px]">Just now</p>
            </div>
          </div>
        </div>

        <button 
          onClick={onClose} 
          className="absolute top-6 right-4 z-[20] p-2 bg-black/20 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm border border-white/10"
        >
          <X className="text-white" size={28} />
        </button>

        {/* Story Content */}
        <div className="flex-1 relative flex items-center justify-center">
          <img 
            src={currentStory.imageURL} 
            className="w-full h-full object-cover" 
            alt="" 
          />
          
          {/* Navigation Overlay */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 cursor-w-resize" onClick={goBack} />
            <div className="flex-1 cursor-e-resize" onClick={goNext} />
          </div>
        </div>

        {/* Footer / Interaction */}
        {currentStory?.uid === currentUserId && (
          <div className="p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/90 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              <Eye size={18} />
              <span className="text-xs font-semibold">{currentStory.views?.length || 0} views</span>
            </div>
            <button 
              onClick={handleDelete}
              className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-full transition-all border border-red-500/30"
              title="Delete Story"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Hint */}
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 left-8 md:left-24">
        <button onClick={goBack} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-all">
          <ChevronLeft size={32} />
        </button>
      </div>
      <div className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-8 md:right-24">
        <button onClick={goNext} className="p-4 bg-white/5 hover:bg-white/10 rounded-full text-white/50 transition-all">
          <ChevronRight size={32} />
        </button>
      </div>
    </div>
  );
};

export default StoryViewer;
