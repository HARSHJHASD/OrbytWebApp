import { Users, FileText, MapPin, X, ArrowRight } from 'lucide-react';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserProfile, Post } from '../types';

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  people: UserProfile[];
  posts: Post[];
  currentUserId?: string;
  loadingPeople?: boolean;
  loadingPosts?: boolean;
}

export default function SearchResultsModal({
  isOpen,
  onClose,
  query,
  people,
  posts,
  currentUserId,
  loadingPeople,
  loadingPosts,
}: SearchResultsModalProps) {
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePersonClick = (uid: string) => {
    navigate(`/app/profile/${uid}`);
    onClose();
  };

  const handlePostClick = (postId: string) => {
    navigate(`/app/post/${postId}`);
    onClose();
  };

  const hasResults = people.length > 0 || posts.length > 0;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fixed left-0 right-0 top-0 max-w-2xl mx-auto bg-white dark:bg-slate-950 rounded-b-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Search Results
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {query ? `Results for "${query}"` : 'Start typing to search'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {!hasResults && query && !loadingPeople && !loadingPosts ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">
                No results found for "{query}"
              </p>
            </div>
          ) : (
            <>
              {/* People Section */}
              {(loadingPeople || people.length > 0) && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                    <Users className="w-4 h-4" />
                    People
                  </h3>
                  {loadingPeople ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : people.length > 0 ? (
                    <div className="space-y-2">
                      {people.map((person) => (
                        <button
                          key={person.uid}
                          onClick={() => handlePersonClick(person.uid)}
                          className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors text-left group"
                        >
                          {person.photoURL ? (
                            <img
                              src={person.photoURL}
                              alt={person.displayName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                              {person.displayName?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {person.displayName}
                            </p>
                            {person.jobRole && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {person.jobRole}
                              </p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No people found</p>
                  )}
                </div>
              )}

              {/* Posts Section */}
              {(loadingPosts || posts.length > 0) && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                    <FileText className="w-4 h-4" />
                    {posts.some((p) => p.type === 'meetup') ? 'Posts & Events' : 'Posts'}
                  </h3>
                  {loadingPosts ? (
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"
                        />
                      ))}
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="space-y-3">
                      {posts.map((post) => (
                        <button
                          key={post._id}
                          onClick={() => handlePostClick(post._id)}
                          className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors border border-slate-200 dark:border-slate-800 group"
                        >
                          <div className="flex items-start gap-3">
                            {post.authorPhoto && (
                              <img
                                src={post.authorPhoto}
                                alt={post.authorName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white text-sm">
                                {post.authorName}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                                {post.type === 'meetup'
                                  ? post.meetupDetails?.title || post.content
                                  : post.content}
                              </p>
                              {post.location?.name && (
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {post.location.name}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No posts found</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
