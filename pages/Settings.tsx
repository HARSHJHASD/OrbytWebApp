import {
  ArrowRight,
  Bell,
  ChevronLeft,
  Loader2,
  PauseCircle,
  Radar,
  ShieldOff,
  Trash2,
  UserX,
  Code,
  Moon,
  Sun,
  Monitor,
  Zap
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { api } from "../services/api";

const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme: currentTheme, setTheme, isDark } = useTheme();
  const navigate = useNavigate();
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [isFuzzed, setIsFuzzed] = useState(false);
  const [liveStatusMode, setLiveStatusMode] = useState('');
  const [discoveryRadius, setDiscoveryRadius] = useState(10);
  const [loading, setLoading] = useState(true);

  // Blocked Users
  const [blockedUsers, setBlockedUsers] = useState<Array<{ uid: string; displayName: string; photoURL?: string }>>([]);
  const [unblockingUid, setUnblockingUid] = useState<string | null>(null);

  useEffect(() => {
    setPushEnabled(isSubscribed);
  }, [isSubscribed]);

  const handlePushToggle = async () => {
    if (pushEnabled) return; // can't unsubscribe programmatically; user must revoke in browser
    setPushLoading(true);
    const success = await subscribe();
    if (success) setPushEnabled(true);
    setPushLoading(false);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const profile = await api.profile.get(user?.uid);
        if (profile) {
          setIsDiscoverable(profile?.isDiscoverable !== false);
          setDiscoveryRadius(profile?.discoveryRadius || 10);
          setIsFuzzed(!!profile?.isFuzzed);
          setLiveStatusMode(profile?.liveStatusMode || '');

          // Load blocked users
          if (profile?.blockedUsers && profile?.blockedUsers?.length > 0) {
            const batchProfiles = await api.profile.getBatch(profile?.blockedUsers);
            setBlockedUsers(batchProfiles?.map((p: any) => ({ uid: p?.uid, displayName: p?.displayName, photoURL: p?.photoURL })));
          }
        }
      } catch (e) {
        console.error("Failed to load settings", e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);



  const toggleDiscoverable = async () => {
    if (!user) return;
    const newValue = !isDiscoverable;
    setIsDiscoverable(newValue);

    try {
      await api.profile.createOrUpdate(user.uid, {
        isDiscoverable: newValue,
      });
    } catch (e) {
      setIsDiscoverable(!newValue);
    }
  };

  const toggleFuzzed = async () => {
    if (!user) return;
    const next = !isFuzzed;
    setIsFuzzed(next);
    try {
      await api.profile.createOrUpdate(user.uid, { isFuzzed: next });
    } catch (e) {
      setIsFuzzed(!next);
    }
  };

  const saveLiveStatus = async (mode: string) => {
    setLiveStatusMode(mode);
    if (!user) return;
    try {
      await api.profile.createOrUpdate(user.uid, { liveStatusMode: mode });
    } catch (e) {
      console.error('Failed to save live status', e);
    }
  };

  const handleRadiusChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setDiscoveryRadius(parseInt(e.target.value));
  };

  const saveRadius = async () => {
    if (!user) return;
    try {
      await api.profile.createOrUpdate(user.uid, {
        discoveryRadius,
      });
    } catch (e) {
      console.error("Failed to save radius");
    }
  };


  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  const handleUnblock = async (targetUid: string) => {
    if (!user) return;
    setUnblockingUid(targetUid);
    try {
      await api.userAction.unblock(user?.uid, targetUid);
      setBlockedUsers(prev => prev.filter(u => u?.uid !== targetUid));
    } catch (e) {
      alert("Failed to unblock user");
    } finally {
      setUnblockingUid(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 shadow-sm z-30 sticky top-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <span className="font-bold text-slate-900 dark:text-white text-lg">
          Settings
        </span>

        <div className="w-10" />
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-6">

        {/* APPEARANCE */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Appearance
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 flex gap-1">
            <button
              onClick={() => setTheme('light')}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${
                currentTheme === 'light' 
                  ? "bg-slate-100 dark:bg-slate-800 text-primary-500 shadow-sm border border-slate-200 dark:border-slate-700" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${
                currentTheme === 'dark' 
                  ? "bg-slate-100 dark:bg-slate-800 text-primary-500 shadow-sm border border-slate-200 dark:border-slate-700" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Dark</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl transition-all ${
                currentTheme === 'system' 
                  ? "bg-slate-100 dark:bg-slate-800 text-primary-500 shadow-sm border border-slate-200 dark:border-slate-700" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Monitor className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">System</span>
            </button>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Notifications
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushEnabled ? "bg-primary-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                }`}>
                {pushLoading
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : <Bell className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <h4 className="text-slate-900 dark:text-white font-bold text-base">Push Notifications</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {!isSupported
                    ? "Not supported on this device"
                    : pushEnabled
                      ? "You'll get notified when away from the app"
                      : "Enable to get notified when away from the app"}
                </p>
              </div>
              <button
                onClick={handlePushToggle}
                disabled={!isSupported || pushEnabled || pushLoading}
                className={`relative inline-flex h-7 w-12 rounded-full transition ${pushEnabled ? "bg-primary-500" : "bg-slate-700"
                  } disabled:opacity-50`}
              >
                <span
                  className={`inline-block h-6 w-6 bg-white rounded-full transform transition ${pushEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
            {pushEnabled && (
              <p className="text-xs text-slate-500 mt-3 pl-14">
                To disable, revoke notification permission in your browser settings.
              </p>
            )}
          </div>
        </section>

        {/* DISCOVERY */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Discovery Settings
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Radar className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-slate-900 dark:text-white font-bold text-base">
                  Discovery Radius
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Show users & posts within {discoveryRadius}km
                </p>
              </div>
              <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                {discoveryRadius}km
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="1000"
              value={discoveryRadius}
              onChange={handleRadiusChange}
              onMouseUp={saveRadius}
              onTouchEnd={saveRadius}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!isDiscoverable ? "bg-orange-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                <PauseCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-slate-900 dark:text-white font-bold text-base">
                  Pause Discoverability
                </h4>
                <p className="text-xs text-slate-400">
                  Hide me from the map and discovery lists.
                </p>
              </div>

              <button
                onClick={toggleDiscoverable}
                className={`relative inline-flex h-7 w-12 rounded-full transition ${!isDiscoverable ? "bg-orange-500" : "bg-slate-700"}`}
              >
                <span
                  className={`inline-block h-6 w-6 bg-white rounded-full transform transition ${!isDiscoverable ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </div>

          {/* The Decoy */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isFuzzed ? "bg-primary-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                <ShieldOff className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-slate-900 dark:text-white font-bold text-base">The Decoy</h4>
                <p className="text-xs text-slate-400">
                  Drift your pin ~300m so people see you're in the neighborhood, not your door.
                </p>
              </div>
              <button
                onClick={toggleFuzzed}
                className={`relative inline-flex h-7 w-12 rounded-full transition ${isFuzzed ? "bg-primary-500" : "bg-slate-700"}`}
              >
                <span className={`inline-block h-6 w-6 bg-white rounded-full transform transition ${isFuzzed ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {/* Live Status Mode */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${liveStatusMode ? "bg-violet-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-slate-900 dark:text-white font-bold text-base">Live Status Mode</h4>
                <p className="text-xs text-slate-400">Broadcasts your vibe — enables Orbit Collision detection.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-1">
              {['', 'Startup Founder', 'Looking for a Co-founder', 'Networking', 'Open to Opportunities', 'Working on my startup', 'Investing/VC', 'Freelancing', 'Hiring'].map(mode => (
                <button
                  key={mode || 'off'}
                  onClick={() => saveLiveStatus(mode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    liveStatusMode === mode
                      ? 'bg-violet-500 border-violet-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-500/50'
                  }`}
                >
                  {mode || 'Off'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ACCOUNT */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Account
          </h3>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              onClick={() => navigate("/app/edit-profile")}
              className="w-full p-4 text-slate-700 dark:text-slate-300 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              Edit Profile
              <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full p-4 text-red-500 dark:text-red-400 flex justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800"
            >
              Sign Out
            </button>

            <button
              onClick={() => navigate('/delete-account')}
              className="w-full p-4 text-red-600 dark:text-red-500 font-bold border-t border-slate-100 dark:border-slate-800 hover:bg-red-500/10 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </button>
          </div>
        </section>

        {/* BLOCKED USERS */}
        {blockedUsers.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
              Blocked Users
            </h3>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {blockedUsers.map(u => (
                <div key={u.uid} className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                    {u.photoURL ? (
                      <img src={u.photoURL} className="w-full h-full object-cover" alt={u.displayName} />
                    ) : (
                      <UserX className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    )}
                  </div>
                  <span className="flex-1 text-slate-900 dark:text-white font-semibold text-sm truncate">{u.displayName}</span>
                  <button
                    onClick={() => handleUnblock(u.uid)}
                    disabled={unblockingUid === u.uid}
                    className="px-3 py-1.5 text-xs font-bold text-orange-400 bg-orange-500/10 rounded-lg border border-orange-500/20 hover:bg-orange-500/20 transition-colors disabled:opacity-50"
                  >
                    {unblockingUid === u.uid ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : 'Unblock'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* LEGAL & ABOUT */}
        <section>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">
            Resources
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <button
              onClick={() => navigate('/about')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Radar className="w-5 h-5 text-blue-500" />
                <span className="text-slate-900 dark:text-white font-medium">About Orbyt</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigate('/blog')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-500" />
                <span className="text-slate-900 dark:text-white font-medium">Orbyt Blog</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigate('/contact')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ArrowRight className="w-5 h-5 text-green-500" />
                <span className="text-slate-900 dark:text-white font-medium">Contact Us</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
            <button
              onClick={() => navigate('/developer-profile')}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Code className="w-5 h-5 text-amber-500" />
                <span className="text-slate-900 dark:text-white font-medium">Developer Profile</span>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </section>

        {/* Info */}
        <div className="text-center pt-8 pb-4">
          <p className="text-xs text-slate-600">Orbyt v1.0.0</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-2 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-300">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-slate-300">Terms of Service</Link>
            <span>•</span>
            <Link to="/guidelines" className="hover:text-slate-300">Guidelines</Link>
            <span>•</span>
            <Link to="/child-policy" className="hover:text-slate-300">Child Safety</Link>
            <span>•</span>
            <Link to="/cookie-policy" className="hover:text-slate-300">Cookies</Link>
            <span>•</span>
            <Link to="/delete-account" className="hover:text-slate-300">Account Deletion</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;