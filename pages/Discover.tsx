import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Briefcase, MapPin, SearchX, User as UserIcon, Heart, X, BadgeCheck, Instagram, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import { useUserLocation } from '../components/LocationGuard';
import { calculateDistance } from '../util/location';
import { POPULAR_INTERESTS, Post, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

/* ──────────────────────────────────────────────────────────────────────────
   Swipeable card — pure pointer-events, no library required
   ────────────────────────────────────────────────────────────────────────── */
interface SwipeableCardProps {
    profile: UserProfile;
    distText: string;
    onSwipe: (dir: 'left' | 'right') => void;
    isTop: boolean;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({ profile, distText, onSwipe, isTop }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const startY = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);
    const isPointerDown = useRef(false);
    const [transform, setTransform] = useState({ x: 0, rot: 0, opacity: 1 });
    const [createdPosts, setCreatedPosts] = useState<Post[]>([]);

    useEffect(() => {
        let active = true;
        api.posts.getUserPosts(profile.uid).then(posts => {
            if (active) setCreatedPosts(posts || []);
        }).catch(() => {
            if (active) setCreatedPosts([]);
        });
        return () => { active = false; };
    }, [profile.uid]);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        if (!isTop) return;
        startX.current = e.clientX;
        startY.current = e.clientY;
        currentX.current = 0;
        isPointerDown.current = true;
        isDragging.current = false;
    }, [isTop]);

    const onPointerMove = useCallback((e: React.PointerEvent) => {
        if (!isPointerDown.current) return;
        const dx = e.clientX - startX.current;
        const dy = e.clientY - startY.current;
        if (!isDragging.current) {
            if (Math.abs(dx) < 10 || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
            isDragging.current = true;
            cardRef.current?.setPointerCapture(e.pointerId);
        }
        currentX.current = dx;
        const rot = dx / 20;
        setTransform({ x: dx, rot, opacity: 1 });
    }, []);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (!isPointerDown.current) return;
        isPointerDown.current = false;
        if (!isDragging.current) return;
        isDragging.current = false;
        const dx = currentX.current;
        currentX.current = 0;

        try {
            cardRef.current?.releasePointerCapture(e.pointerId);
        } catch(err) {}

        if (Math.abs(dx) > 100) {
            const dir = dx > 0 ? 'right' : 'left';
            const flyX = dir === 'right' ? 600 : -600;
            setTransform({ x: flyX, rot: flyX / 20, opacity: 0 });
            setTimeout(() => onSwipe(dir), 300);
        } else {
            setTransform({ x: 0, rot: 0, opacity: 1 });
        }
    }, [onSwipe]);

    return (
        <div
            ref={cardRef}
            className="absolute inset-0 touch-pan-y select-none"
            style={{
                transform: `translateX(${transform.x}px) rotate(${transform.rot}deg)`,
                opacity: transform.opacity,
                transition: isDragging.current ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
                cursor: isTop ? 'grab' : 'default',
                pointerEvents: isTop ? 'auto' : 'none',
                zIndex: isTop ? 10 : 5,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-x-hidden overflow-y-auto no-scrollbar flex flex-col transition-colors duration-300">
                {/* Swipe Hint Overlays */}
                {transform.x > 40 && (
                    <div className="absolute top-6 left-6 z-20 border-4 border-green-500 text-green-500 font-black text-2xl px-4 py-2 rounded-xl rotate-[-20deg]">LIKE 💚</div>
                )}
                {transform.x < -40 && (
                    <div className="absolute top-6 right-6 z-20 border-4 border-red-500 text-red-500 font-black text-2xl px-4 py-2 rounded-xl rotate-[20deg]">PASS ✕</div>
                )}

                {/* Photo */}
                <div className="h-[48%] min-h-[240px] shrink-0 bg-slate-100 dark:bg-slate-800 relative group">
                    {profile?.photoURL ? (
                        <img src={profile?.photoURL} alt={profile?.displayName} draggable={false} className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center pointer-events-none">
                            <UserIcon className="w-20 h-20 text-slate-300 dark:text-slate-600" />
                        </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
                </div>

                {/* Info */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-start">
                    <div className="flex items-baseline gap-2 mb-1">
                        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{profile?.displayName}</h2>
                        {profile?.badgeTitle && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" aria-label={profile.badgeTitle} />}
                        {profile?.dob && (
                            <span className="text-xl font-medium text-slate-500 dark:text-slate-400">
                                {Math.floor((new Date().getTime() - new Date(profile?.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}
                            </span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {profile?.jobRole && (
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <Briefcase className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{profile?.jobRole}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1.5 bg-primary-500/10 px-2.5 py-1 rounded-lg border border-primary-500/20">
                            <MapPin className="w-3.5 h-3.5 text-primary-500 dark:text-primary-400" />
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-300">{distText}</span>
                        </div>
                        {profile?.gender && profile.gender !== 'prefer_not_to_say' && (
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg capitalize">
                                {profile.gender}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-4 text-xs text-slate-600 dark:text-slate-300">
                        {profile?.badgeTitle && (
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />
                                <span><strong className="text-slate-800 dark:text-slate-100">Designation:</strong> {profile.badgeTitle}</span>
                            </div>
                        )}
                        {profile?.jobRole && (
                            <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
                                <span><strong className="text-slate-800 dark:text-slate-100">Occupation:</strong> {profile.jobRole}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary-500 shrink-0" />
                            <span><strong className="text-slate-800 dark:text-slate-100">Location:</strong> {profile?.lastLocation?.name || 'Nearby'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 text-center text-primary-500 font-black shrink-0">~</span>
                            <span><strong className="text-slate-800 dark:text-slate-100">Distance away:</strong> {distText}</span>
                        </div>
                    </div>

                    {profile?.liveStatusMode && (
                        <div className="mb-4 inline-flex self-start items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-xs font-bold text-green-700 dark:text-green-300">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            {profile.liveStatusMode}
                        </div>
                    )}

                    {profile?.bio && (
                        <div className="mb-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-1">About me</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">"{profile.bio}"</p>
                        </div>
                    )}

                    {profile?.interests && profile?.interests?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {profile?.interests?.map(id => {
                                const tag = POPULAR_INTERESTS.find(i => i.id === id);
                                return (
                                    <span key={id} className="text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-full border border-slate-200 dark:border-slate-700">
                                        {tag ? `${tag.emoji} ${tag.label}` : id}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {profile?.instagramHandle && (
                        <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <Instagram className="w-4 h-4 text-pink-500" />
                            @{profile.instagramHandle.replace(/^@/, '')}
                        </div>
                    )}

                    {profile?.thatsMePhotos?.filter(Boolean).length > 0 && (
                        <div className="mt-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">That's me</h3>
                            <div className="space-y-3">
                                {profile.thatsMePhotos.filter(Boolean).map((photo, index) => (
                                    <img
                                        key={`${photo}-${index}`}
                                        src={photo}
                                        alt={`${profile.displayName} That's Me photo ${index + 1}`}
                                        draggable={false}
                                        className="w-full max-h-[420px] rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 space-y-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Posts</h3>
                        {createdPosts.filter(post => post.type !== 'meetup').length > 0 ? (
                            createdPosts.filter(post => post.type !== 'meetup').map(post => (
                                <div key={post._id || post.createdAt} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4">
                                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{post.content}</p>
                                    {post.imageURL && <img src={post.imageURL} alt="Post" className="mt-3 w-full max-h-64 rounded-lg object-cover" />}
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">No posts yet.</p>
                        )}

                        <h3 className="pt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Meetups created</h3>
                        {createdPosts.filter(post => post.type === 'meetup').length > 0 ? (
                            createdPosts.filter(post => post.type === 'meetup').map(post => (
                                <div key={post._id || post.createdAt} className="rounded-xl border border-primary-500/20 bg-primary-500/5 p-4">
                                    <p className="font-bold text-slate-800 dark:text-slate-100">{post.meetupDetails?.title || post.content}</p>
                                    {post.meetupDetails?.activity && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{post.meetupDetails.activity}</p>}
                                    {post.meetupDetails?.date && <p className="mt-2 text-xs font-semibold text-primary-600 dark:text-primary-300">{post.meetupDetails.date}</p>}
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-slate-500 dark:text-slate-400">No meetups created yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────────────────
   Main Discover Page
   ────────────────────────────────────────────────────────────────────────── */
export default function Discover() {
    const { user } = useAuth();
    const { location: myLocation } = useUserLocation();

    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [topIndex, setTopIndex] = useState(0);
    const [swipeHistory, setSwipeHistory] = useState<{ uid: string; dir: 'left' | 'right' }[]>([]);

    useEffect(() => {
        const fetchDiscover = async () => {
            if (!user) return;
            try {
                const [allUsers, myProf] = await Promise.all([
                    api.profile.getAllWithLocation(user?.uid, undefined, true),
                    api.profile.get(user?.uid)
                ]);

                const excluded = new Set<string>([
                    user?.uid,
                    ...(myProf?.friends || []),
                    ...(myProf?.outgoingRequests || []),
                    ...(myProf?.incomingRequests || []),
                    ...(myProf?.blockedUsers || []),
                    ...(myProf?.passedUsers || []),
                ]);

                const filtered = allUsers.filter((u: any) => {
                    if (excluded.has(u?.uid)) return false;
                    if (u?.isDiscoverable === false) return false;
                    return true;
                }).sort((a: any, b: any) => {
                    const location = myLocation;
                    const distance = (u: any) => {
                        if (!location || !u.lastLocation) return Infinity;
                        const R = 6371e3;
                        const rad = Math.PI / 180;
                        const dLat = (u.lastLocation.lat - location!.lat) * rad;
                        const dLng = (u.lastLocation.lng - location!.lng) * rad;
                        const value = Math.sin(dLat / 2) ** 2 + Math.cos(location!.lat * rad) * Math.cos(u.lastLocation.lat * rad) * Math.sin(dLng / 2) ** 2;
                        return R * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
                    };
                    return distance(a) - distance(b);
                });

                setProfiles(filtered);
                setTopIndex(0);
            } catch (e) {
                console.error("Failed to load discover profiles", e);
            } finally {
                setLoading(false);
            }
        };
        fetchDiscover();

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') fetchDiscover();
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [user, myLocation]);

    const handleSwipe = useCallback((index: number, dir: 'left' | 'right') => {
        const targetUid = profiles[index]?.uid;
        if (!targetUid) return;
        if (dir === 'right' && user?.uid) {
            // Do not await to avoid blocking the UI swipe update
            api.friends.sendRequest(user.uid, targetUid).catch(e => {
                console.error("Failed to send request", e);
            });
        }
        
        // Only a left swipe is a pass; a right swipe is the positive action above.
        if (dir === 'left' && user?.uid) {
            api.profile.pass(user.uid, targetUid).catch(e => {
                console.error("Failed to sync pass", e);
            });
        }

        setSwipeHistory(history => [...history, { uid: targetUid, dir }]);
        setTopIndex(i => i + 1);
    }, [profiles, user]);

    const canBacktrack = swipeHistory.at(-1)?.dir === 'left';
    const handleBacktrack = useCallback(() => {
        const lastSwipe = swipeHistory.at(-1);
        if (!lastSwipe || lastSwipe.dir !== 'left') return;

        setSwipeHistory(history => history.slice(0, -1));
        setTopIndex(index => Math.max(0, index - 1));
        if (user?.uid) {
            api.profile.unpass(user.uid, lastSwipe.uid).catch(e => {
                console.error("Failed to undo pass", e);
            });
        }
    }, [swipeHistory, user]);

    if (loading) {
        return (
            <div className="flex-1 flex justify-center items-center min-h-[60vh]">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const visibleProfiles = profiles.slice(topIndex, topIndex + 3);

    if (visibleProfiles.length === 0) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center min-h-[60vh] text-center px-6">
                <SearchX className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 mb-2">No discoverable people yet.</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">There are no profiles available to show right now.</p>
                {canBacktrack && (
                    <button onClick={handleBacktrack} className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary-500/40 px-5 py-3 text-sm font-bold text-primary-500 hover:bg-primary-500/10">
                        <RotateCcw className="w-4 h-4" /> Backtrack
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col pb-24 overflow-x-hidden">
            <div className="px-6 pt-6 mb-5 flex items-end justify-between">
                <div>
                    <p className="text-primary-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Find your people</p>
                    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Discover</h1>
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 pb-1">{profiles.length - topIndex} profiles</span>
            </div>

            {/* Card Stack */}
            <div className="relative mx-auto w-full max-w-sm px-4" style={{ height: '72vh' }}>
                {/* Render up to 3 cards, bottom → top */}
                {[...visibleProfiles].reverse().map((profile, reverseIdx) => {
                    const stackIdx = visibleProfiles.length - 1 - reverseIdx;
                    const isTop = stackIdx === 0;
                    const scale = 1 - stackIdx * 0.04;
                    const translateY = stackIdx * 10;
                    const distText = myLocation && profile.lastLocation
                        ? calculateDistance(myLocation.lat, myLocation.lng, profile.lastLocation.lat, profile.lastLocation.lng)
                        : "Nearby";

                    return (
                        <div
                            key={profile.uid}
                            className="absolute inset-0"
                            style={{
                                transform: `scale(${scale}) translateY(${translateY}px)`,
                                zIndex: isTop ? 10 : 10 - stackIdx,
                                transition: 'transform 0.3s ease',
                            }}
                        >
                            <SwipeableCard
                                profile={profile}
                                distText={distText}
                                isTop={isTop}
                                onSwipe={(dir) => handleSwipe(topIndex + stackIdx, dir)}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-8 mt-4 pt-2">
                <button
                    onClick={handleBacktrack}
                    disabled={!canBacktrack}
                    aria-label="Backtrack last left swipe"
                    className="w-12 h-12 self-center rounded-full bg-white dark:bg-slate-900 border-2 border-amber-500/30 dark:border-amber-500/50 flex items-center justify-center text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-amber-50 dark:hover:bg-amber-500/10 active:scale-95 transition-all shadow-xl"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <button
                    onClick={() => handleSwipe(topIndex, 'left')}
                    className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-2 border-red-500/30 dark:border-red-500/50 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 transition-all shadow-xl"
                >
                    <X className="w-7 h-7" />
                </button>
                <button
                    onClick={() => handleSwipe(topIndex, 'right')}
                    className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border-2 border-green-500/30 dark:border-green-500/50 flex items-center justify-center text-green-500 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-500/10 active:scale-95 transition-all shadow-xl"
                >
                    <Heart className="w-7 h-7" />
                </button>
            </div>

            <p className="text-center text-xs text-slate-600 mt-3">
                {profiles.length - topIndex} profile{profiles.length - topIndex !== 1 ? 's' : ''} remaining
            </p>

        </div>
    );
}
