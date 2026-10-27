import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';
import ErrorBoundary from './components/ErrorBoundary';
import { api } from './services/api';
import LocationGuard from './components/LocationGuard';
import { Loader2 } from 'lucide-react';

const Layout = lazy(() => import('./components/Layout'));
const AuthPage = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Profile = lazy(() => import('./pages/Profile'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const Feed = lazy(() => import('./pages/Feed'));
const CreatePost = lazy(() => import('./pages/CreatePost'));
const EditPost = lazy(() => import('./pages/EditPost'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const MapPage = lazy(() => import('./pages/MapPage'));
const Chat = lazy(() => import('./pages/Chat'));
const Inbox = lazy(() => import('./pages/Inbox'));
const NotificationsPage = lazy(() => import('./pages/Notifications'));
const Discover = lazy(() => import('./pages/Discover'));
const Settings = lazy(() => import('./pages/Settings'));
const DesktopLanding = lazy(() => import('./pages/DeskTopLandingPage'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ChildPolicy = lazy(() => import('./pages/ChildPolicy'));
const DeveloperProfile = lazy(() => import('./pages/DeveloperProfile'));
const Guidelines = lazy(() => import('./pages/Guidelines'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
const About = lazy(() => import('./pages/About'));
const Blog = lazy(() => import('./pages/Blog'));
const Contact = lazy(() => import('./pages/Contact'));
const DeleteAccount = lazy(() => import('./pages/DeleteAccount'));
const Communities = lazy(() => import('./pages/Communities'));
const CommunityRoom = lazy(() => import('./pages/CommunityRoom'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUserDetails = lazy(() => import('./pages/AdminUserDetails'));

// Guard component to protect routes and check profile existence
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, status } = useAuth();
  const location = useLocation();
  // A profile that was complete last time almost always still is: render straight away
  // (no loader flash on every screen change) and confirm with the server in the background.
  const cacheKey = user ? `profileComplete:${user.uid}` : '';
  const cachedComplete = (() => {
    try { return !!cacheKey && localStorage.getItem(cacheKey) === '1'; } catch { return false; }
  })();
  const [profileChecked, setProfileChecked] = useState(cachedComplete);
  const [hasProfile, setHasProfile] = useState(cachedComplete);

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        try {
          // getStrict throws on failure. get() returned null for any error (rate limit,
          // server restart, offline), which was read as "no profile" and sent signed-in
          // users back to onboarding.
          const profile = await api.profile.getStrict(user.uid);
          const isOnboarded = !!profile && !!profile.displayName && !!profile.photoURL && !!profile.dob && !!profile.gender && Array.isArray(profile.interests) && profile.interests.length > 0 && Array.isArray(profile.thatsMePhotos) && profile.thatsMePhotos.filter(Boolean).length >= 3;
          setHasProfile(isOnboarded);
          try {
            if (isOnboarded) localStorage.setItem(`profileComplete:${user.uid}`, '1');
            else localStorage.removeItem(`profileComplete:${user.uid}`);
          } catch { /* storage unavailable */ }
        } catch (e) {
          // Server unreachable: keep the user in the app rather than in onboarding.
          console.error("Error checking profile — assuming it exists", e);
          setHasProfile(true);
        } finally {
          setProfileChecked(true);
        }
      } else {
        setProfileChecked(true);
      }
    };

    if (status === 'authenticated') {
      checkProfile();
    } else if (status === 'unauthenticated') {
      setProfileChecked(true);
    }
  }, [user, status]);

  if (status === 'loading' || (status === 'authenticated' && !profileChecked)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/auth" />;
  }

  // Force Onboarding if profile is incomplete
  if (status === 'authenticated' && !hasProfile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Prevent accessing Onboarding if profile is already completed
  if (status === 'authenticated' && hasProfile && location.pathname === '/onboarding') {
    return <Navigate to="/app" replace />;
  }

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

const AppRoutes = () => {
  const { status } = useAuth();
  const { isDark } = useTheme();

  return (
    <NotificationProvider>
      <div className={`antialiased ${isDark ? 'dark' : ''} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 min-h-screen`}>
        <Suspense
          fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          }
        >
        <Routes>
          {/* Admin — completely isolated, no auth provider dependency */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users/:uid" element={<AdminUserDetails />} />

          {/* Public landing — always root */}
          <Route path="/" element={<DesktopLanding />} />

          {/* Auth */}
          <Route path="/auth" element={status === 'authenticated' ? <Navigate to="/app" /> : <AuthPage />} />

          {/* Onboarding - Isolated */}
          <Route path="/onboarding" element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } />

          {/* Privacy & Terms - Isolated & Unprotected */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/child-policy" element={<ChildPolicy />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/delete-account" element={<DeleteAccount />} />

          {/* Direct Chat - Isolated */}
          <Route path="/app/chat/:uid" element={
            <ProtectedRoute>
              <LocationGuard>
                <Chat />
              </LocationGuard>
            </ProtectedRoute>
          } />

          {/* Group Chat - Isolated */}
          <Route path="/app/chat/group/:groupId" element={
            <ProtectedRoute>
              <LocationGuard>
                <Chat />
              </LocationGuard>
            </ProtectedRoute>
          } />

          {/* Settings - Isolated */}
          <Route path="/app/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />



          {/* Developer Profile - Isolated */}
          <Route path="/app/developer" element={
            <ProtectedRoute>
              <DeveloperProfile />
            </ProtectedRoute>
          } />

          {/* Community Room - Isolated (full-screen chat) */}
          <Route path="/app/rooms/:communityId" element={
            <ProtectedRoute>
              <LocationGuard>
                <CommunityRoom />
              </LocationGuard>
            </ProtectedRoute>
          } />

          {/* Main App - Protected by Location & Layout */}
          <Route element={
            <ProtectedRoute>
              <LocationGuard>
                <Layout />
              </LocationGuard>
            </ProtectedRoute>
          }>
            <Route path="/app" element={<Feed />} />
            <Route path="/app/map" element={<MapPage />} />
            <Route path="/app/rooms" element={<Communities />} />
            <Route path="/app/inbox" element={<Inbox />} />
            <Route path="/app/discover" element={<Discover />} />
            <Route path="/app/notifications" element={<NotificationsPage />} />
            <Route path="/app/profile/:uid?" element={<Profile />} />
            <Route path="/app/create-post" element={<CreatePost />} />
            <Route path="/app/edit-post/:id" element={<EditPost />} />
            <Route path="/app/post/:id" element={<PostDetail />} />
            <Route path="/app/edit-profile" element={<EditProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </Suspense>
      </div>
    </NotificationProvider>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ConfigProvider>
            <Router>
              <AppRoutes />
            </Router>
          </ConfigProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;