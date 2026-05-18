import { Home, Map, MessageCircle, PlusSquare, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import DeviceFrame from './DeviceFrame';
// import MainLogo from '../assets/logo.png'; 

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const path = location.pathname;
    let title = "Orbyt";
    if (path === '/app') title = "Feed | Orbyt";
    else if (path === '/app/map') title = "Live Map | Orbyt";
    else if (path === '/app/inbox') title = "Chat | Orbyt";
    else if (path === '/app/discover') title = "Discover | Orbyt";
    else if (path.startsWith('/app/profile')) title = "Profile | Orbyt";
    else if (path === '/app/settings') title = "Settings | Orbyt";
    else if (path === '/app/create-post') title = "New Post | Orbyt";

    document.title = title;
  }, [location.pathname]);


  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const profilePath = user ? `/app/profile/${user.uid}` : '/auth';

  // Poll for unread messages
  useEffect(() => {
    const checkUnread = async () => {
      if (!user) return;
      try {
        const count = await api.chat.getUnreadCount(user.uid);
        setUnreadMessages(count);
      } catch (e) {
        console.error(e);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    const handleResize = (): void => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout((): void => {
        setIsDesktop(window.innerWidth >= 768);
      }, 200);
    };
    window.addEventListener('resize', handleResize);
    return (): void => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const content = React.useMemo(() => (
    <div className={`flex flex-col min-h-[100dvh] bg-slate-950 ${isDesktop ? 'h-[820px]' : ''} overflow-hidden`}>
      {/* Desktop Top Navigation */}
      {/* <div className="hidden md:flex sticky top-0 z-[3000] bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 items-center justify-between px-8 h-16">
        <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
          <img
            draggable={false}
            src={MainLogo}
            alt="Orbyt Logo"
            className="h-10 w-auto object-contain group-hover:scale-105 transition-transform duration-200"
          />
        </div>
        <div className="flex items-center gap-4 text-slate-300 font-bold text-sm">
           <span>Welcome to Orbyt Web</span>
        </div>
      </div> */}

      {/* Offline Banner */}
      {isOffline && (
        <div className="bg-red-500 text-white text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top duration-300 sticky top-0 z-[4000]">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          You are currently offline. Some features may be limited.
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto ${isDesktop ? '' : 'pb-24'}`} style={{ 
        paddingBottom: isDesktop ? 0 : 'calc(5rem + env(safe-area-inset-bottom))' 
      }}>
        <Outlet />
      </div>

      {/* Bottom Navigation — 5 tabs */}
      <div className={`${isDesktop ? 'absolute' : 'fixed'} bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 pb-[max(env(safe-area-inset-bottom),0px)] z-[2000]`}>
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-1">

          {/* Home */}
          <button
            onClick={() => navigate('/app')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/app') ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Home className={`w-5 h-5 ${isActive('/app') ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Home</span>
          </button>

          {/* Map */}
          <button
            onClick={() => navigate('/app/map')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/app/map') ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Map className={`w-5 h-5 ${isActive('/app/map') ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Map</span>
          </button>

          {/* Discover */}
          <button
            onClick={() => navigate('/app/discover')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/app/discover') ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isActive('/discover') ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`w-5 h-5 ${isActive('/app/discover') ? 'text-primary-500' : ''}`}
              >
                <path d="m3 11 18-5v12L3 14v-3z" />
                <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
              </svg>
            </div>
            <span className="text-[10px] font-medium">Discover</span>
          </button>

          {/* Create Post — elevated center */}
          <button
            onClick={() => navigate('/app/create-post')}
            className="relative -top-5"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 flex items-center justify-center text-white transform transition-transform active:scale-95 border-4 border-slate-950">
              <PlusSquare className="w-6 h-6" />
            </div>
          </button>

          {/* Notifications */}
          {/* <button
            onClick={() => navigate('/notifications')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive('/notifications') ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <Bell className={`w-5 h-5 ${isActive('/notifications') ? 'fill-current' : ''}`} />
              {notifUnreadCount > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {notifUnreadCount > 9 ? '9+' : notifUnreadCount}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Activity</span>
          </button> */}
          <button
            onClick={() => navigate('/app/inbox')}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive('/app/inbox') || isActive('/app/chat') ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <MessageCircle className={`w-5 h-5 ${isActive('/app/inbox') || isActive('/app/chat') ? 'fill-current' : ''}`} />
              {unreadMessages > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </div>
              )}
            </div>
            <span className="text-[10px] font-medium">Chat</span>
          </button>



          {/* Profile */}
          <button
            onClick={() => navigate(profilePath)}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 relative ${isActive('/app/profile') ? 'text-primary-500' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <div className="relative">
              <User className={`w-5 h-5 ${isActive('/app/profile') ? 'fill-current' : ''}`} />
              {/* {unreadMessages > 0 && (
                <div className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-slate-900">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </div>
              )} */}
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </button>

        </div>
      </div>
    </div>
  ), [isDesktop, isOffline, unreadMessages, location.pathname, user]);

  return isDesktop ? (
    <DeviceFrame>
      {content}
    </DeviceFrame>
  ) : content;
};

export default Layout;