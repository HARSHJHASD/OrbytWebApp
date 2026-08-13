import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ConfigProvider } from './context/ConfigContext';
import ErrorBoundary from './components/ErrorBoundary';
import { api } from './services/api';
import AuthPage from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Feed from './pages/Feed';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import PostDetail from './pages/PostDetail';
import MapPage from './pages/MapPage';
import Chat from './pages/Chat';
import Inbox from './pages/Inbox';
import NotificationsPage from './pages/Notifications';
import Discover from './pages/Discover';
import Layout from './components/Layout';
import LocationGuard from './components/LocationGuard';
import Settings from './pages/Settings';
import { Loader2 } from 'lucide-react';
import DesktopLanding from './pages/DeskTopLandingPage';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ChildPolicy from './pages/ChildPolicy';
import DeveloperProfile from './pages/DeveloperProfile';
import Guidelines from './pages/Guidelines';
import CookiePolicy from './pages/CookiePolicy';
import About from './pages/About';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import DeleteAccount from './pages/DeleteAccount';
import Communities from './pages/Communities';
import CommunityRoom from './pages/CommunityRoom';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDetails from './pages/AdminUserDetails';


// Guard component to protect routes and check profile existence
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, status } = useAuth();
  const location = useLocation();
  const [profileChecked, setProfileChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        try {
          const profile = await api.profile.get(user.uid);
          const isOnboarded = !!profile && !!profile.displayName && !!profile.photoURL && !!profile.dob && !!profile.gender && Array.isArray(profile.interests) && profile.interests.length > 0 && Array.isArray(profile.thatsMePhotos) && profile.thatsMePhotos.filter(Boolean).length >= 3;
          setHasProfile(isOnboarded);
        } catch (e) {
          console.error("Error checking profile", e);
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