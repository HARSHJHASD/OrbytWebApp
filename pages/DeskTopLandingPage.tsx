import {
  ArrowRight,
  ChevronDown,
  Globe,
  Heart,
  MapPin,
  Menu,
  MessageCircle,
  QrCode,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../services/api";
import { UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import AppModal from "../components/ui/AppModal";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { MainLogo } from "../util/Images";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.orbyt.official.app";

const DesktopLanding: React.FC = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [realUsers, setRealUsers] = useState<UserProfile[]>([]);
  const [testimonialUsers, setTestimonialUsers] = useState<(UserProfile & { reviewText: string })[]>([]);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLaunchApp = () => {
    if (user) {
      navigate("/app");
    } else {
      navigate("/auth");
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await api.profile.getAllWithLocation();
        // Take users with photos, up to 4
        const withPhotos = users
          .filter((u: UserProfile) => u.photoURL)
          .slice(0, 4);
        setRealUsers(withPhotos);

        // Reviews to assign
        const reviews = [
          "Orbyt is exactly what I needed! It's so refreshing to meet real people specifically looking for genuine connections. The map feature makes it so easy to see who's around.",
          "Finally, a social app that actually prioritizes real-world interactions. I've met some incredible people through here. The 18+ environment feels much more mature and safe.",
          "The best discovery app I've used. I love how I can see people nearby and just send a quick wave. It's made my social life so much more active!",
          "Safety and authenticity are huge for me, and Orbyt delivers. Seeing real profiles and having verified features gives me peace of mind when meeting up.",
          "Found my favorite weekend hiking partner here! The interest matching is spot on, and the community is super welcoming.",
          "If you're tired of endless swiping and want to actually meet people, this is it. The spontaneous meetups at local spots are the highlight of my week.",
        ];

        // Filter for "complete" profiles
        const completeProfiles = users.filter(
          (u: UserProfile) =>
            u.photoURL &&
            u.displayName &&
            (u.bio || u.jobRole || (u.interests && u.interests.length > 0))
        );

        // Shuffle and pick up to 3 for the grid (or more if layout allows, but 3 is current)
        const selected = [...completeProfiles]
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map((u, i) => ({
            ...u,
            reviewText: reviews[i % reviews.length],
          }));

        setTestimonialUsers(selected);
      } catch (error) {
        console.error("Failed to fetch real users for landing page:", error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const config = await api.config.getVersion();
        if (config?.minAppVersion) setLatestVersion(config.minAppVersion);
      } catch {
        // silently ignore
      }
    };
    fetchVersion();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 overflow-x-hidden selection:bg-primary-500/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer group"
            onClick={() => navigate("/")}
          >
            <img
              draggable={false}
              src={MainLogo}
              alt="Orbyt Logo"
              className="h-12 w-auto object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]"
            />
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-8 text-slate-400 text-sm font-medium items-center">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-white transition-colors"
            >
              How it Works
            </a>
            <a
              href="/guidelines"
              className="hover:text-white transition-colors"
            >
              Safety
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <Button
              variant="primary"
              onClick={handleLaunchApp}
              className="rounded-full px-6 h-10 text-sm ml-4"
            >
              Enter Orbyt
            </Button>
          </div>

          {/* Mobile Menu Button (Visible on tablet/small laptops that trigger desktop view but have narrow screens) */}
          <button
            className="md:hidden text-slate-300"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-[20%] left-[10%] w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div
            className="absolute top-[30%] right-[10%] w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
          <div className="flex-1 space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-primary-400 text-xs font-bold uppercase tracking-wider animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Strictly 18+ • A Growing Social Discovery App</span>
            </div>

            <h1 className="text-6xl lg:text-8xl font-black leading-[1] tracking-tighter text-white animate-fade-in-up">
              Your World, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-pink-400 to-purple-500 drop-shadow-sm">
                Connected Live
              </span>
            </h1>

            <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Orbyt is an adult-only social discovery platform that bridges the
              gap between digital interactions and real-world connections.
              Discover who's nearby, join local conversations, and make
              meaningful connections instantly.
            </p>

            <div
              className="flex flex-col sm:flex-row sm:flex-wrap gap-5 justify-center lg:justify-start pt-10 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              {/* Launch Web */}
              <Button
                variant="primary"
                onClick={handleLaunchApp}
                className="group flex items-center justify-center gap-3 
    rounded-2xl px-10 py-6 text-lg font-bold
    bg-gradient-to-r from-primary-600 to-primary-400
    shadow-2xl shadow-primary-500/30
    hover:shadow-primary-500/50
    transition-all duration-300
    active:scale-95 border-none"
              >
                Launch&nbsp;Orbyt Web
                <ArrowRight className="w-6 h-6 transition-transform duration-200 group-hover:translate-x-1" />
              </Button>

              {/* Play Store */}
              <a
                href={PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 
    px-8 py-5 min-w-[220px]
    bg-slate-900/60 backdrop-blur-xl
    border border-white/10 rounded-2xl
    hover:bg-slate-800
    hover:border-slate-700
    shadow-xl transition-all duration-300
    active:scale-95 no-underline"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center
      bg-primary-500/10 border border-primary-500/20
      rounded-xl transition-colors
      group-hover:bg-primary-500/20 shrink-0"
                >
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.18 1.07 13.36 12 3.18 22.93A2 2 0 0 1 2 21.13V2.87a2 2 0 0 1 1.18-1.8z" fill="#EA4335"/>
                    <path d="M21.14 10.28 18.3 8.67l-3.18 3.33 3.18 3.33 2.87-1.63a2 2 0 0 0 0-3.42z" fill="#FBBC04"/>
                    <path d="M13.36 12 3.18 1.07a2 2 0 0 1 2.1.2l10.8 6.16L13.36 12z" fill="#4285F4"/>
                    <path d="M13.36 12l2.72 4.57-10.8 6.16a2 2 0 0 1-2.1.2L13.36 12z" fill="#34A853"/>
                  </svg>
                </div>

                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                    {latestVersion ? `Latest: v${latestVersion}` : "Android App"}
                  </p>
                  <p className="font-bold text-white text-base transition-colors group-hover:text-primary-400">
                    Get it on Play Store
                  </p>
                </div>
              </a>

              {/* QR Button */}
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="group flex items-center gap-4 
    px-8 py-5 min-w-[220px]
    bg-slate-900/40 backdrop-blur-xl
    border border-white/5 rounded-2xl
    hover:bg-slate-800
    hover:border-slate-700
    shadow-xl transition-all duration-300
    active:scale-95"
              >
                <div
                  className="w-12 h-12 flex items-center justify-center
      bg-white/5 border border-white/10
      rounded-xl transition-colors
      group-hover:bg-white/10"
                >
                  <QrCode className="w-8 h-8 text-white/50 transition-colors group-hover:text-white" />
                </div>

                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">
                    Mobile Hub
                  </p>
                  <p className="font-bold text-white text-base transition-colors group-hover:text-primary-400">
                    Scan for App
                  </p>
                </div>
              </button>
            </div>

            <div className="flex flex-col justify-center text-left space-y-2">
              <div className="flex -space-x-2">
                {realUsers.length > 0
                  ? realUsers.map((u) => (
                      <div
                        key={u.uid}
                        className={`w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 overflow-hidden`}
                      >
                        <img
                          draggable={false}
                          src={u.photoURL}
                          alt={u.displayName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  : [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 overflow-hidden`}
                      >
                        <img
                          draggable={false}
                          src={`https://i.pravatar.cc/100?img=${10 + i}`}
                          alt="User"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                <div className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400 leading-none px-1">
                  JOIN US
                </div>
              </div>
            </div>
          </div>

          {/* Phone Mockup with Live Preview */}
          <div className="flex-1 relative w-full max-w-[400px] lg:max-w-none group/phone">
            <div className="absolute -inset-4 bg-primary-500/10 rounded-[4rem] blur-2xl opacity-0 group-hover/phone:opacity-100 transition-opacity duration-700"></div>

            <div className="relative mx-auto border-slate-800 bg-slate-950 border-[12px] rounded-[3.5rem] h-[720px] w-[350px] shadow-2xl flex flex-col overflow-hidden ring-1 ring-slate-700/50 scale-95 hover:scale-100 transition-transform duration-500 z-10">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-7 bg-slate-950 z-30 rounded-b-2xl w-36 mx-auto flex items-center justify-center gap-2">
                <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
                <div className="w-2 h-2 bg-slate-800 rounded-full"></div>
              </div>

              {/* StatusBar Mock */}
              <div className="absolute top-0 inset-x-0 h-12 bg-transparent z-20 flex justify-between items-end px-8 pb-1 text-[10px] font-bold text-white/40">
                <span>9:41</span>
                <div className="flex gap-1.5">
                  <div className="w-3.5 h-2 border border-white/20 rounded-[2px]"></div>
                  <Zap className="w-2 h-2 fill-current" />
                </div>
              </div>

              <div className="rounded-[2.5rem] overflow-hidden w-full h-full bg-slate-900 relative">
                {/* Live App Iframe */}
                <iframe
                  src="/app"
                  className="w-full h-full border-none"
                  title="Orbyt Web App Preview"
                  loading="lazy"
                />

                {/* Interactive Overlay (removes itself on first click to allow interaction) */}
                <div
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 flex flex-col items-center justify-center text-center p-8 transition-opacity duration-300 hover:opacity-0 pointer-events-none group-hover/phone:opacity-100"
                  id="preview-overlay"
                >
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                    <Sparkles className="w-8 h-8 text-primary-400 animate-pulse" />
                  </div>
                  <h4 className="text-white font-bold text-lg mb-2">
                    Live App Preview
                  </h4>
                  <p className="text-slate-300 text-sm">
                    Experience Orbyt directly from your browser. Try the feed
                    and explore the map.
                  </p>
                </div>
              </div>
            </div>

            {/* Floating Badge */}
            {/* <div className="absolute top-20 -right-12 bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl animate-slide-up" style={{ animationDelay: '0.5s' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                                    <MessageCircle className="w-5 h-5 fill-current" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">New Message</p>
                                    <p className="text-xs text-slate-400">Sarah wants to connect</p>
                                </div>
                            </div>
                        </div> */}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-slate-800 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Community", value: "Real People", icon: Users },
            { label: "Platform", value: "Starting Fresh", icon: Globe },
            { label: "Growth", value: "Growing Daily", icon: Zap },
            { label: "Quality", value: "Handcrafted", icon: Star },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex items-center gap-4 justify-center md:justify-start"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {stat?.value}
                </div>
                <div className="text-sm text-slate-500 font-medium">
                  {stat?.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-sm font-bold text-primary-500 uppercase tracking-wider mb-2">
              Why Orbyt?
            </h2>
            <h3 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Designed for real life.
            </h3>
            <p className="text-slate-400 text-lg">
              Most social apps keep you glued to your screen. Orbyt uses
              technology to get you out into the world and meeting people
              face-to-face.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Live Location Map",
                desc: "See who's hanging out at your favorite coffee shop or park in real-time. Privacy controls ensure you're only visible when you want to be.",
              },
              {
                icon: Users,
                title: "Instant Connections",
                desc: "Break the ice easily. Send a wave to someone nearby or join a public group chat based on your location.",
              },
              {
                icon: Shield,
                title: "Adults Only (18+)",
                desc: "Strictly for adults. We use advanced verification and community reporting to ensure Orbyt remains a safe, 18+ environment for everyone.",
              },
              {
                icon: Heart,
                title: "Interest Matching",
                desc: "Find your tribe. Filter the map to show people who share your passion for hiking, photography, or gaming.",
              },
              {
                icon: MessageCircle,
                title: "Ephemeral Chat",
                desc: "Chats that encourage meeting up. Share your live location temporarily to meet up with friends easily.",
              },
              {
                icon: Globe,
                title: "Local Events",
                desc: "Discover impromptu gatherings and events happening right now around you. Never miss out on the action.",
              },
            ].map((feat, i) => (
              <div
                key={i}
                className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 hover:border-primary-500/30 transition-all hover:bg-slate-800 hover:-translate-y-1 group"
              >
                <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 border border-slate-700 group-hover:bg-primary-500/10 group-hover:border-primary-500/50 transition-colors">
                  <feat.icon className="w-7 h-7 text-slate-300 group-hover:text-primary-500 transition-colors" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">
                  {feat?.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">{feat?.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-24 bg-slate-900 border-y border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1 space-y-12">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Start connecting in minutes
                </h2>
                <p className="text-slate-400">
                  No complicated setup. Just create a profile and start
                  exploring your neighborhood.
                </p>
              </div>

              <div className="space-y-8">
                {[
                  {
                    step: "01",
                    title: "Create your profile",
                    desc: "Sign up, add a photo, and select your interests.",
                  },
                  {
                    step: "02",
                    title: "Enable location",
                    desc: "Let us know where you are to find people nearby.",
                  },
                  {
                    step: "03",
                    title: "Start exploring",
                    desc: "Browse the map, send requests, and meet up!",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center font-bold text-slate-500">
                      {item?.step}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        {item?.title}
                      </h4>
                      <p className="text-slate-400">{item?.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 rounded-3xl blur-2xl opacity-20 transform rotate-3"></div>
              <img
                draggable={false}
                src="https://images.unsplash.com/photo-1543269865-cbf427effbad?q=80&w=1000&auto=format&fit=crop"
                alt="Friends meeting"
                className="relative rounded-3xl shadow-2xl border border-slate-700 grayscale hover:grayscale-0 transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-16">
            Loved by explorers everywhere
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {(testimonialUsers.length > 0
              ? testimonialUsers
              : [
                  {
                    reviewText:
                      "I moved to a new city and didn't know anyone. Orbyt helped me find a hiking group within my first week!",
                    displayName: "Elena R.",
                    jobRole: "Digital Nomad",
                    photoURL: "https://i.pravatar.cc/100?img=5",
                  },
                  {
                    reviewText:
                      "Finally, a social app that actually gets you off your phone. The real-time map is a game changer for spontaneous meetups.",
                    displayName: "Marcus T.",
                    jobRole: "Photographer",
                    photoURL: "https://i.pravatar.cc/100?img=11",
                  },
                  {
                    reviewText:
                      "The safety features make me feel comfortable meeting new people. Verified profiles give peace of mind.",
                    displayName: "Sarah J.",
                    jobRole: "Student",
                    photoURL: "https://i.pravatar.cc/100?img=9",
                  },
                ]
            ).map((t, i) => (
              <div
                key={i}
                className="bg-slate-900 p-8 rounded-3xl border border-slate-800 relative group hover:border-primary-500/50 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4 text-yellow-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 leading-relaxed italic">
                  "{t?.reviewText}"
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 to-purple-500 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <img
                      draggable={false}
                      src={t?.photoURL}
                      alt={t?.displayName}
                      className="relative w-12 h-12 rounded-full object-cover border-2 border-slate-800"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">
                      {t?.displayName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t?.jobRole ||
                        ('interests' in t && t.interests && t.interests.length > 0
                          ? t.interests[0]
                          : "Member")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="py-24 bg-slate-900 border-t border-slate-800"
      >
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Is Orbyt free to use?",
                a: "Yes! Orbyt is completely free to download and use. Every feature is unlocked for everyone by default. We may introduce optional enhancements in the future, but the core experience will always remain accessible.",
              },
              {
                q: "How does the location privacy work?",
                a: "Your privacy is our priority. You can choose to be visible only to friends, or pause your discoverability to be completely invisible on the map whenever you want.",
              },
              {
                q: "Is it available on iOS and Android?",
                a: "Yes. Orbyt is available in your mobile browser on both iOS and Android, with full core features accessible without app installation.",
              },
              {
                q: "How do you verify users?",
                a: "We use a combination of email verification, community reporting, and strict age verification. Orbyt is a platform exclusively for users aged 18 and over. We have a zero-tolerance policy for underage accounts.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-900 transition-colors"
                  onClick={() => toggleFaq(i)}
                >
                  <span className="font-bold text-white">{item?.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-500 transition-transform ${activeFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6 text-slate-400 leading-relaxed animate-fade-in">
                    {item?.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950 to-primary-900/20"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to explore your world?
          </h2>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Join the fastest growing social discovery community today. Your next
            adventure is just around the corner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="primary"
              onClick={handleLaunchApp}
              className="rounded-full px-8 h-12 text-base shadow-xl shadow-primary-500/25"
            >
              Launch Web App
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            No download required • Works on all devices
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 md:col-span-1">
              <div className="flex py-4 items-center">
                <img
                  draggable={false}
                  src={MainLogo}
                  alt="Orbyt Logo"
                  className="h-12 w-auto object-contain hover:scale-105 transition-transform duration-200"
                />
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Connecting the world, one neighborhood at a time. Built for the
                mobile generation.{" "}
                <span className="text-slate-400 font-bold italic">
                  Strictly 18+ Only.
                </span>
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li>
                  <a
                    href="/about"
                    className="hover:text-primary-400 transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Download App
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Company</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li>
                  <a
                    href="/guidelines"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Community Guidelines
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li>
                  <a
                    href="/privacy"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="/child-policy"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Child Safety Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/cookies"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Cookie Policy
                  </a>
                </li>
                <li>
                  <a
                    href="/delete-account"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Account Deletion
                  </a>
                </li>
                <li>
                  <a
                    href="/guidelines"
                    className="hover:text-primary-400 transition-colors"
                  >
                    Guidelines
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>
              &copy; {new Date().getFullYear()} Orbyt Inc. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-400">
                Twitter
              </a>
              <a href="#" className="hover:text-slate-400">
                Instagram
              </a>
              <a href="#" className="hover:text-slate-400">
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </footer>

      <AppModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="Download on Android"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="bg-white p-4 rounded-3xl shadow-2xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(PLAY_STORE_URL)}`}
              alt="Scan QR Code to open Play Store"
              className="w-64 h-64"
            />
          </div>
          <div className="space-y-2">
            <p className="text-slate-200 font-bold text-lg">Scan to Open Play Store</p>
            {latestVersion && (
              <p className="text-primary-400 text-sm font-semibold">Latest version: v{latestVersion}</p>
            )}
            <p className="text-slate-400 text-sm">
              Point your phone's camera at this QR code to open the Orbyt listing on the Google Play Store.
            </p>
          </div>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-2xl transition-colors shadow-lg shadow-primary-500/20 no-underline"
          >
            Open Play Store
          </a>
        </div>
      </AppModal>
    </div>
  );
};

export default DesktopLanding;
