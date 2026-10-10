import {
  CalendarDays,
  ChevronDown,
  EyeOff,
  Flag,
  Footprints,
  Hand,
  MapPin,
  Menu,
  MessageCircle,
  QrCode,
  Shield,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppModal from "../components/ui/AppModal";
import { useAuth } from "../context/AuthContext";
import { MainLogo, MainLogoOnly } from "../util/Images";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.orbyt.official.app";
const PLAY_BADGE =
  "https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png";

// Interests shown orbiting in the hero. Illustrative only — not real members.
const ORBITERS: { emoji: string; label: string; ring: 1 | 2 | 3; angle: number }[] = [
  { emoji: "☕", label: "Coffee", ring: 1, angle: 20 },
  { emoji: "🏃", label: "Running", ring: 1, angle: 200 },
  { emoji: "🎮", label: "Gaming", ring: 2, angle: 110 },
  { emoji: "🎵", label: "Live music", ring: 2, angle: 300 },
  { emoji: "📚", label: "Books", ring: 3, angle: 60 },
  { emoji: "🏔️", label: "Treks", ring: 3, angle: 170 },
  { emoji: "📸", label: "Photography", ring: 3, angle: 260 },
];
// Ring radius as a fraction of the orbit box width.
const RING_RADIUS = { 1: 0.26, 2: 0.39, 3: 0.5 } as const;

const FAQ = [
  {
    q: "Is Orbyt free?",
    a: "Yes. Every feature is free to use.",
  },
  {
    q: "Can people see exactly where I am?",
    a: "No. Others only ever see an approximate area, never your exact position. You can also turn off discoverability to disappear from the map entirely.",
  },
  {
    q: "Is there an iPhone app?",
    a: "Orbyt is on Google Play for Android. On iPhone, open Orbyt in Safari and use the web app — it has the same core features.",
  },
  {
    q: "Who can join?",
    a: "Orbyt is for adults only. You must be 18 or older to sign up, and accounts reported as underage are removed.",
  },
  {
    q: "What if someone makes me uncomfortable?",
    a: "Block or report them from their profile or any post. Blocked people can no longer see you, message you or find you on the map.",
  },
];

function OrbitHero() {
  return (
    <div className="orbit relative mx-auto aspect-square w-full" aria-hidden="true">
      {([1, 2, 3] as const).map((r) => (
        <div
          key={r}
          className="absolute rounded-full border border-[#1E2A52]"
          style={{ inset: `${(0.5 - RING_RADIUS[r]) * 100}%` }}
        />
      ))}
      <div className="orbit-sweep absolute inset-0 rounded-full" />

      {/* one rotating layer per ring, at different speeds; chips counter-rotate to stay upright */}
      {([1, 2, 3] as const).map((ring) => (
        <div key={ring} className={`orbit-layer orbit-layer-${ring} absolute inset-0`}>
          {ORBITERS.filter((o) => o.ring === ring).map((o) => {
            const rad = (o.angle * Math.PI) / 180;
            const x = 50 + Math.cos(rad) * RING_RADIUS[ring] * 100;
            const y = 50 + Math.sin(rad) * RING_RADIUS[ring] * 100;
            return (
              <div key={o.label} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
                <div className={`orbit-upright orbit-upright-${ring} h-0 w-0`}>
                  <div className="w-max -translate-x-1/2 -translate-y-1/2">
                    <div className="orbit-chip flex items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#111A3A]/85 py-1.5 pl-1.5 pr-3.5 text-sm text-[#DCE3F5] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] backdrop-blur">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B2550] text-base">
                        {o.emoji}
                      </span>
                      {o.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* the wave: one rose pulse closing in on you */}
      <div className="absolute left-1/2 top-1/2 h-0 w-0">
        <div className="wave-ping absolute -left-[60px] -top-[60px] h-[120px] w-[120px] rounded-full border-2 border-[#F43F5E]" />
      </div>

      {/* you */}
      <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-[#5B8CFF] to-[#2F5BEA] shadow-[0_0_60px_10px_rgba(79,124,255,0.35)] sm:h-24 sm:w-24">
          <img src={MainLogoOnly} alt="" className="h-14 w-14 object-contain sm:h-16 sm:w-16" draggable={false} />
        </div>
        <span className="mt-2 rounded-full bg-white/10 px-3 py-0.5 text-xs font-semibold text-white">You</span>
      </div>

      {/* incoming wave notification */}
      <div className="wave-card absolute bottom-[4%] right-[-2%] flex items-center gap-3 rounded-2xl border border-[#F43F5E]/30 bg-[#1A1230]/90 px-4 py-3 shadow-2xl backdrop-blur">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F43F5E]/15 text-lg">👋</span>
        <div>
          <p className="text-sm font-semibold text-white">Someone nearby waved</p>
          <p className="text-xs text-[#AEB8D6]">Loves running too · about 1 km away</p>
        </div>
      </div>
    </div>
  );
}

export default function DesktopLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const openWebApp = () => navigate(user ? "/app" : "/auth");
  const webAppLabel = user ? "Open Orbyt" : "Use it in your browser";

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#privacy", label: "Privacy" },
    { href: "#faq", label: "FAQ" },
  ];

  const playBadge = (
    <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play" className="block">
      <img src={PLAY_BADGE} alt="Get it on Google Play" width={176} height={68} className="-m-2.5 h-[68px] w-[176px] max-w-none" draggable={false} />
    </a>
  );

  return (
    <div className="landing min-h-screen overflow-x-hidden bg-[#070B1A] font-sans text-[#C9D2EA] selection:bg-[#4F7CFF]/30">
      <style>{`
        .landing .font-display { font-family: "Bricolage Grotesque", "Plus Jakarta Sans", sans-serif; }
        .landing a:focus-visible, .landing button:focus-visible { outline: 2px solid #7FA2FF; outline-offset: 3px; }
        .orbit { max-width: 540px; }
        .orbit-layer-1 { animation: orbit-spin 80s linear infinite; }
        .orbit-layer-2 { animation: orbit-spin 120s linear infinite reverse; }
        .orbit-layer-3 { animation: orbit-spin 170s linear infinite; }
        .orbit-upright-1 { animation: orbit-spin 80s linear infinite reverse; }
        .orbit-upright-2 { animation: orbit-spin 120s linear infinite; }
        .orbit-upright-3 { animation: orbit-spin 170s linear infinite reverse; }
        @keyframes orbit-spin { to { transform: rotate(360deg); } }
        .orbit-upright { transform-origin: 0 0; }
        .orbit-sweep { background: conic-gradient(from 0deg, rgba(79,124,255,0.18), transparent 20%); animation: orbit-spin 10s linear infinite; -webkit-mask: radial-gradient(circle, #000 0 49.6%, transparent 50%); mask: radial-gradient(circle, #000 0 49.6%, transparent 50%); }
        .wave-ping { opacity: 0; animation: wave-in 5s cubic-bezier(.2,.7,.2,1) infinite 1s; }
        @keyframes wave-in { 0% { transform: scale(4.4); opacity: 0; } 12% { opacity: .9; } 60% { transform: scale(1); opacity: .55; } 75%, 100% { transform: scale(1); opacity: 0; } }
        .wave-card { opacity: 0; animation: card-in 5s ease-out infinite 1s; }
        @keyframes card-in { 0%, 50% { opacity: 0; transform: translateY(8px); } 60%, 92% { opacity: 1; transform: none; } 100% { opacity: 0; transform: none; } }
        .map-grid { background-image: linear-gradient(rgba(127,162,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(127,162,255,0.07) 1px, transparent 1px); background-size: 28px 28px; }
        @media (max-width: 640px) {
          .orbit { max-width: 300px; }
          .orbit-chip { font-size: 12px; padding-right: 10px; }
          .orbit-chip > span { width: 22px; height: 22px; font-size: 13px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .orbit-layer-1, .orbit-layer-2, .orbit-layer-3, .orbit-upright-1, .orbit-upright-2, .orbit-upright-3, .orbit-sweep { animation: none; }
          .wave-ping { animation: none; }
          .wave-card { animation: none; opacity: 1; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#070B1A]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <button onClick={() => navigate("/")} aria-label="Orbyt home" className="flex items-center rounded-lg">
            <img src={MainLogo} alt="Orbyt" className="h-9 w-auto object-contain" draggable={false} />
          </button>

          <div className="hidden items-center gap-8 text-sm font-medium text-[#AEB8D6] md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="rounded transition-colors hover:text-white">
                {l.label}
              </a>
            ))}
            <button
              onClick={openWebApp}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0A1030] transition hover:bg-[#DCE6FF]"
            >
              {user ? "Open Orbyt" : "Open web app"}
            </button>
          </div>

          <button
            className="rounded-xl p-2 text-[#DCE3F5] md:hidden"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/5 bg-[#070B1A] px-5 pb-6 pt-2 md:hidden">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block py-3 text-base text-[#DCE3F5]">
                {l.label}
              </a>
            ))}
            <button onClick={openWebApp} className="mt-3 w-full rounded-full bg-white py-3 text-sm font-semibold text-[#0A1030]">
              {user ? "Open Orbyt" : "Open web app"}
            </button>
          </div>
        )}
      </nav>

      {/* Hero */}
      <header className="relative pt-28 sm:pt-36">
        <div className="pointer-events-none absolute left-1/2 top-24 h-[620px] w-[620px] -translate-x-1/2 rounded-full bg-[#2F5BEA]/10 blur-[120px] lg:left-[72%]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
          <div className="text-center lg:text-left">
            <h1 className="font-display text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-[74px]">
              Meet the people already around you.
            </h1>
            <p className="mx-auto mt-6 max-w-[34rem] text-lg leading-relaxed text-[#AEB8D6] lg:mx-0">
              Orbyt shows you people nearby who share your interests, and the plans they're making tonight. Wave hello, join a meetup, and turn the strangers around you into friends.
            </p>

            <div className="mt-9 flex flex-col items-center gap-5 sm:flex-row sm:justify-center lg:justify-start">
              {playBadge}
              <button
                onClick={openWebApp}
                className="h-12 whitespace-nowrap rounded-full border border-white/15 px-6 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
              >
                {webAppLabel}
              </button>
              <button
                onClick={() => setIsQrModalOpen(true)}
                className="hidden h-12 items-center gap-2 whitespace-nowrap rounded-full px-2 text-sm font-medium text-[#AEB8D6] transition hover:text-white xl:inline-flex"
              >
                <QrCode className="h-4 w-4" />
                Scan to get the app
              </button>
            </div>
            <p className="mt-6 text-sm text-[#7D88AB]">Free · Adults 18+ only · Your exact location is never shown</p>
          </div>

          <div className="relative px-6 pb-6 sm:px-10">
            <OrbitHero />
          </div>
        </div>
      </header>

      {/* Features: bento */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-24 pt-20 sm:px-8 sm:pt-28">
        <div className="max-w-3xl">
          <h2 className="font-display text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
            Less scrolling. More going out.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#AEB8D6]">
            Everything in Orbyt points at the same thing: the people and plans within reach of where you are right now.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-6">
          {/* Nearby (lead tile) */}
          <article className="relative min-h-[420px] overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#0D1430] p-7 sm:p-9 md:col-span-4 md:row-span-2">
            <div className="map-grid absolute inset-0" />
            <div className="absolute right-[-60px] top-[-40px] h-72 w-72 rounded-full bg-[#4F7CFF]/15 blur-3xl" />
            <div className="relative flex h-full flex-col">
              <MapPin className="h-6 w-6 text-[#7FA2FF]" />
              <h3 className="font-display mt-4 text-2xl font-semibold text-white sm:text-3xl">See who's nearby</h3>
              <p className="mt-2 max-w-md leading-relaxed text-[#AEB8D6]">
                A live map of people around you, filtered by what you're into. Choose your own radius, from your street to your whole city.
              </p>
              <div className="relative mt-8 min-h-[190px] flex-1">
                {[
                  { e: "🎵", l: "Live music", x: "4%", y: "16%" },
                  { e: "☕", l: "Coffee", x: "40%", y: "0%" },
                  { e: "🏸", l: "Badminton", x: "62%", y: "48%" },
                  { e: "📚", l: "Books", x: "14%", y: "66%" },
                ].map((p) => (
                  <span
                    key={p.l}
                    className="absolute flex items-center gap-2 rounded-full border border-white/10 bg-[#111A3A]/90 py-1.5 pl-1.5 pr-3 text-sm text-[#DCE3F5]"
                    style={{ left: p.x, top: p.y }}
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1B2550]">{p.e}</span>
                    {p.l}
                  </span>
                ))}
                <span className="absolute left-[44%] top-[42%] h-4 w-4 rounded-full bg-[#4F7CFF] shadow-[0_0_0_8px_rgba(79,124,255,0.18),0_0_0_20px_rgba(79,124,255,0.08)]" />
              </div>
            </div>
          </article>

          {/* Meetups */}
          <article className="flex flex-col rounded-[28px] border border-white/[0.07] bg-[#0D1430] p-7 md:col-span-2 md:row-span-2">
            <CalendarDays className="h-6 w-6 text-[#7FA2FF]" />
            <h3 className="font-display mt-4 text-2xl font-semibold text-white">Join plans tonight</h3>
            <p className="mt-2 leading-relaxed text-[#AEB8D6]">
              Post a plan or ask to join one. The host says yes, and a group chat opens for everyone going.
            </p>
            <div className="mt-auto pt-6">
              <div className="rounded-2xl border border-white/10 bg-[#121B40] p-4">
                <p className="text-xs font-medium text-[#7FA2FF]">Sunday, 6:30 AM</p>
                <p className="mt-1 font-semibold text-white">Easy 5K run, then chai</p>
                <p className="mt-1 text-sm text-[#AEB8D6]">Near the lake · 2 spots left</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {["🏃", "🙂", "😎"].map((e, i) => (
                      <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#121B40] bg-[#1B2550] text-xs">
                        {e}
                      </span>
                    ))}
                  </div>
                  <span className="rounded-full bg-[#4F7CFF] px-3 py-1 text-xs font-semibold text-white">Ask to join</span>
                </div>
              </div>
            </div>
          </article>

          {/* Wave — the one rose tile */}
          <article className="rounded-[28px] border border-[#F43F5E]/25 bg-gradient-to-br from-[#2A1030] to-[#150F2C] p-7 md:col-span-2">
            <Hand className="h-6 w-6 text-[#FB7185]" />
            <h3 className="font-display mt-4 text-xl font-semibold text-white">Send a wave</h3>
            <p className="mt-2 leading-relaxed text-[#D8C6DA]">
              Feeling social? Wave to people around you. If they wave back, it's a match.
            </p>
          </article>

          <article className="rounded-[28px] border border-white/[0.07] bg-[#0D1430] p-7 md:col-span-2">
            <Footprints className="h-6 w-6 text-[#7FA2FF]" />
            <h3 className="font-display mt-4 text-xl font-semibold text-white">Crossed paths</h3>
            <p className="mt-2 leading-relaxed text-[#AEB8D6]">
              Get a nudge when you pass someone with the same interests, so next time you can say hi.
            </p>
          </article>

          <article className="rounded-[28px] border border-white/[0.07] bg-[#0D1430] p-7 md:col-span-2">
            <div className="flex gap-3">
              <MessageCircle className="h-6 w-6 text-[#7FA2FF]" />
              <Sparkles className="h-6 w-6 text-[#7FA2FF]" />
            </div>
            <h3 className="font-display mt-4 text-xl font-semibold text-white">Rooms and moments</h3>
            <p className="mt-2 leading-relaxed text-[#AEB8D6]">
              Chat in local rooms for your interests, and share 24-hour moments of what you're up to.
            </p>
          </article>
        </div>
      </section>

      {/* How it works — a real sequence, so numbered */}
      <section id="how-it-works" className="scroll-mt-24 border-y border-white/5 bg-[#0A0F24]">
        <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <h2 className="font-display max-w-xl text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
            From sign-up to hello in three steps
          </h2>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { t: "Make your profile", d: "Add a few photos and pick your interests. It takes about two minutes." },
              { t: "Turn on location", d: "Orbyt uses it to find people and plans near you. Others only see a rough area." },
              { t: "Say hello", d: "Wave, message someone, or ask to join a plan. Then put the phone away and go." },
            ].map((s, i) => (
              <li key={s.t} className="border-t border-white/10 pt-6">
                <span className="font-display text-5xl font-bold text-[#2D3E80]">{i + 1}</span>
                <h3 className="mt-3 text-xl font-semibold text-white">{s.t}</h3>
                <p className="mt-2 leading-relaxed text-[#AEB8D6]">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0B1230]">
          <div className="map-grid absolute inset-0" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_45%,rgba(79,124,255,0.22),transparent_55%)]" />
          <div className="absolute right-[10%] top-1/2 hidden h-60 w-60 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-[#7FA2FF]/40 bg-[#4F7CFF]/10 md:flex">
            <span className="text-sm font-medium text-[#AEB8D6]">What others see</span>
          </div>
          <div className="relative p-8 sm:p-12 md:max-w-[58%]">
            <Shield className="h-7 w-7 text-[#7FA2FF]" />
            <h2 className="font-display mt-5 text-3xl font-bold tracking-[-0.02em] text-white sm:text-4xl">
              Nearby, not exposed
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#AEB8D6]">
              Orbyt is built around location, so it's built around protecting yours.
            </p>
            <ul className="mt-8 space-y-5">
              {[
                { icon: MapPin, t: "Only a rough area is shown", d: "Your position is blurred before anyone sees it. Your exact location is never shared." },
                { icon: EyeOff, t: "Go invisible any time", d: "Turn off discoverability and you disappear from the map and nearby lists." },
                { icon: Flag, t: "Block and report in one tap", d: "Blocked people can't see you, message you or find you." },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="flex gap-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <Icon className="h-[18px] w-[18px] text-[#DCE3F5]" />
                  </span>
                  <div>
                    <p className="font-semibold text-white">{t}</p>
                    <p className="mt-1 leading-relaxed text-[#AEB8D6]">{d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pb-24 sm:px-8">
        <h2 className="font-display text-center text-4xl font-bold tracking-[-0.02em] text-white">Questions</h2>
        <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
          {FAQ.map((item, i) => {
            const open = openFaq === i;
            return (
              <div key={item.q}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="text-lg font-semibold text-white">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#7D88AB] transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {open && <p className="-mt-1 pb-6 pr-10 leading-relaxed text-[#AEB8D6]">{item.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-5 pb-24 sm:px-8">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2F5BEA] to-[#1B2E8C] px-8 py-14 text-center sm:py-20">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/15" />
          <div className="pointer-events-none absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full border border-white/10" />
          <Users className="mx-auto h-8 w-8 text-white/80" />
          <h2 className="font-display mx-auto mt-5 max-w-2xl text-4xl font-bold tracking-[-0.02em] text-white sm:text-5xl">
            Someone near you is free tonight.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-lg text-[#DCE6FF]">Get Orbyt and see who's in your orbit.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row">
            {playBadge}
            <button
              onClick={openWebApp}
              className="h-12 whitespace-nowrap rounded-full bg-white px-6 text-sm font-semibold text-[#1B2E8C] transition hover:bg-[#DCE6FF]"
            >
              {webAppLabel}
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <img src={MainLogo} alt="Orbyt" className="h-9 w-auto object-contain" draggable={false} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#7D88AB]">
              Meet the people already around you. For adults 18 and over.
            </p>
          </div>
          {[
            {
              h: "Product",
              links: [
                { l: "About", href: "/about" },
                { l: "Blog", href: "/blog" },
                { l: "Get the app", href: PLAY_STORE_URL, ext: true },
              ],
            },
            {
              h: "Support",
              links: [
                { l: "Contact", href: "/contact" },
                { l: "Community guidelines", href: "/guidelines" },
                { l: "Delete your account", href: "/delete-account" },
              ],
            },
            {
              h: "Legal",
              links: [
                { l: "Privacy policy", href: "/privacy" },
                { l: "Terms of service", href: "/terms" },
                { l: "Child safety policy", href: "/child-policy" },
                { l: "Cookie policy", href: "/cookies" },
              ],
            },
          ].map((col) => (
            <div key={col.h}>
              <p className="font-semibold text-white">{col.h}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map((lnk: { l: string; href: string; ext?: boolean }) => (
                  <li key={lnk.l}>
                    <a
                      href={lnk.href}
                      {...(lnk.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      className="rounded text-[#AEB8D6] transition-colors hover:text-white"
                    >
                      {lnk.l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto max-w-6xl border-t border-white/5 px-5 py-6 text-sm text-[#5E6A8E] sm:px-8">
          © {new Date().getFullYear()} Orbyt
        </div>
      </footer>

      <AppModal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title="Get Orbyt on your phone">
        <div className="flex flex-col items-center text-center">
          <div className="rounded-2xl bg-white p-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(PLAY_STORE_URL)}`}
              alt="QR code linking to Orbyt on Google Play"
              className="h-[220px] w-[220px]"
              draggable={false}
            />
          </div>
          <p className="mt-5 text-sm text-[#AEB8D6]">Scan with your Android phone's camera to open Orbyt on Google Play.</p>
        </div>
      </AppModal>
    </div>
  );
}
