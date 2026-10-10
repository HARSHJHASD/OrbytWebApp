import { Home, Hash, Map, MessageCircle, Plus, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import DeviceFrame from './DeviceFrame';
// import MainLogo from '../assets/logo.png'; 

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadMessages, unreadRooms, clearUnreadMessages, clearUnreadRooms } = useNotifications();
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
    else if (path === '/app/rooms') title = "Rooms | Orbyt";
    else if (path.startsWith('/app/rooms/')) title = "Room Chat | Orbyt";
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

  // Clear badge counts when navigating to their respective pages
  useEffect(() => {
    if (location.pathname.startsWith('/app/inbox') || location.pathname.startsWith('/app/chat')) {
      clearUnreadMessages();
    }
    if (location.pathname.startsWith('/app/rooms') || location.pathname.startsWith('/app/communities')) {
      clearUnreadRooms();
    }
  }, [location.pathname]);

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

  const DiscoverIcon = ({ className, active }: { className?: string; active?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );

  const navItems: { label: string; path: string; match: string[]; Icon: any; badge?: number; fillWhenActive?: boolean }[] = [
    { label: 'Home', path: '/app', match: ['/app'], Icon: Home, fillWhenActive: true },
    { label: 'Map', path: '/app/map', match: ['/app/map'], Icon: Map },
    { label: 'Discover', path: '/app/discover', match: ['/app/discover'], Icon: DiscoverIcon, fillWhenActive: true },
    { label: 'Chat', path: '/app/inbox', match: ['/app/inbox', '/app/chat'], Icon: MessageCircle, badge: unreadMessages },
    { label: 'Rooms', path: '/app/rooms', match: ['/app/rooms'], Icon: Hash, badge: unreadRooms },
    { label: 'Profile', path: profilePath, match: ['/app/profile'], Icon: User },
  ];

  const renderTab = (item: (typeof navItems)[number]) => {
    const active = item.match.some((m) => isActive(m));
    const { Icon } = item;
    return (
      <button
        key={item.label}
        onClick={() => navigate(item.path)}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={`relative flex h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] transition-colors ${
          active ? 'bg-primary-500/15 text-primary-300' : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <span className="relative">
          {item.label === 'Discover'
            ? <DiscoverIcon className="h-[19px] w-[19px]" active={active} />
            : <Icon className={`h-[19px] w-[19px] ${active && item.fillWhenActive ? 'fill-current' : ''}`} strokeWidth={active ? 2.4 : 2} />}
          {!!item.badge && item.badge > 0 && (
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-slate-900 bg-rose-500 px-0.5 text-[9px] font-bold text-white">
              {item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </span>
        <span className="text-[10px] font-medium leading-none">{item.label}</span>
      </button>
    );
  };

  const content = React.useMemo(() => (
    <div className={`app-shell relative flex flex-col bg-slate-950 overflow-hidden ${isDesktop ? 'h-full' : 'min-h-[100dvh]'}`}>
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
      {/* Bottom padding keeps every page's last content clear of the floating nav bar.
          On desktop this area must exactly fill the phone frame (it used to be taller,
          so the end of each page was cut off behind the bar). The map is full-bleed
          and positions its own controls above the bar. */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar" style={{
        paddingBottom: location.pathname === '/app/map'
          ? 0
          : isDesktop ? 96 : 'calc(6.5rem + env(safe-area-inset-bottom))'
      }}>
        <Outlet />
      </div>

      {/* Bottom navigation: floating glass bar */}
      <nav
        aria-label="Main"
        className={`${isDesktop ? 'absolute' : 'fixed'} inset-x-0 bottom-0 z-[2000] px-3 pb-[max(env(safe-area-inset-bottom),12px)] pointer-events-none`}
      >
        <div className="pointer-events-auto mx-auto flex h-[64px] max-w-md items-center justify-between rounded-[26px] border border-white/[0.08] bg-slate-900/75 px-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
          {navItems.slice(0, 3).map(renderTab)}

          {/* Create post */}
          <button
            onClick={() => navigate('/app/create-post')}
            aria-label="Create post"
            className="mx-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-950 shadow-[0_8px_24px_-8px_rgba(255,255,255,0.35)] transition-transform active:scale-95"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>

          {navItems.slice(3).map(renderTab)}
        </div>
      </nav>
    </div>
  ), [isDesktop, isOffline, unreadMessages, unreadRooms, location.pathname, user]);

  return (
    <>
      {isDesktop ? <DeviceFrame>{content}</DeviceFrame> : content}
    </>
  );
};

export default Layout;