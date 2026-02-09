import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  ChevronDown,
  Globe2,
  Layers,
  LogOut,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  Wand2
} from "lucide-react";
import { BACKEND_ORIGIN, TOKEN_KEY } from "../../config";
import { isJwtValid } from "../../lib/auth";
import { useUser } from "../../hooks/useUser";
import { JobLifecycle } from "./JobLifecycle";

type LandingPageProps = {
  onNavigate?: (path: string) => void;
};

const LandingPage = ({ onNavigate }: LandingPageProps) => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem(TOKEN_KEY) : null;
  const isAuthed = isJwtValid(token);
  const ctaPath = isAuthed ? "/dashboard" : "/auth";
  const primaryCtaLabel = isAuthed ? "Open dashboard" : "Get started";
  const secondaryCtaLabel = isAuthed ? "Dashboard" : "Sign in";
  const { user } = useUser({ enabled: isAuthed, redirectOnUnauthorized: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const resolveAvatarUrl = (value: unknown) => {
    if (!value) return "";
    const trimmed = String(value).trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const base = BACKEND_ORIGIN || (typeof window !== "undefined" ? window.location.origin : "");
    if (!base) return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return trimmed.startsWith("/") ? `${base}${trimmed}` : `${base}/${trimmed}`;
  };

  const displayName =
    user?.display_name ||
    user?.name ||
    user?.username ||
    (user?.email ? String(user.email).split("@")[0] : "User");
  const avatarUrl = resolveAvatarUrl(user?.photo_link || "");

  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const features = [
    {
      title: "Unified candidate hub",
      url: "298da08d-bbb3-4fc8-a014-4eaf4c571e2e",
      description: "All profiles, notes, and timelines in one calm workspace.",
      icon: Users
    },
    {
      title: "Apply Assist workflows",
      url: "28965bdc-9c51-46f1-b4ca-5c37a13d3984",
      description: "Draft resumes and outreach steps with prebuilt playbooks.",
      icon: Wand2
    },
    {
      title: "Tailor Resume Generation",
      url: "975434f1-a01b-4b41-b048-09f7a4eab899",
      description: "Generate the perfect resume for any job description in seconds.",
      icon: Layers
    },
    {
      title: "Inbox & Calendar Sync",
      url: "05f128b2-c65c-4bc3-869e-9466651c46ac",
      description: "Bidders & Callers can sync with your email and calendar seamlessly.",
      icon: Mail
    },
    {
      title: "24/7/12 Support",
      url: "def5373e-2e57-413b-95a3-5ae32237b154",
      description: "Always here to support your team, no matter your time zone.",
      icon: CalendarCheck
    },
    {
      title: "Security first",
      url: "8268f91c-f981-45e0-8c44-2ca14c578a33",
      description: "Role based access with clear audit history baked in.",
      icon: ShieldCheck
    }
  ];

  const stats = [
    { label: "Job search time saved (weekly)", value: "23 hrs" },
    { label: "Application time saved (weekly)", value: "42 hrs" },
    { label: "Response lift", value: "3.4x" },
    { label: "Hiring timeline reduced by", value: "3 months" }
  ];

  const steps = [
    {
      title: "Capture every lead",
      description: "Import profiles and emails into a single timeline."
    },
    {
      title: "Launch tailored outreach",
      description: "Generate resumes and messages with repeatable templates."
    },
    {
      title: "Hire with confidence",
      description: "Track approvals, interviews, and offer status in one view."
    }
  ];

  const testimonials = [
    {
      quote:
        "JobDesk365 replaced four tools and finally gave our team a calm daily workflow.",
      name: "Jamie Liu",
      role: "Talent Ops Lead, Northbridge"
    },
    {
      quote:
        "The apply assist templates cut prep time in half and improved response rates.",
      name: "Arun Patel",
      role: "Recruiting Manager, Brightlane"
    },
    {
      quote:
        "We can see every request and interview in one place without chasing updates.",
      name: "Sofia Ramos",
      role: "Hiring Partner, Atlas Growth"
    }
  ];

  const pricing = [
    {
      name: "Starter",
      price: "$29",
      description: "For lean teams getting organized.",
      highlights: ["Up to 3 recruiters", "Unified inbox", "Basic analytics"]
    },
    {
      name: "Scale",
      price: "$79",
      description: "For fast growing agencies.",
      highlights: ["Unlimited projects", "Apply Assist", "Calendar sync", "Team permissions"],
      featured: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For larger orgs with advanced needs.",
      highlights: ["Dedicated success lead", "Custom integrations", "Advanced security"]
    }
  ];

  const handleNavigate = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-page/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <img src="/images/logo.png" alt="JobDesk365" className="h-9 w-auto object-contain" />
          </div>
          <div className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <button type="button" onClick={() => handleNavigate("/dashboard")} className="hover:text-ink">
              Product
            </button>
            <button type="button" className="hover:text-ink">
              Pricing
            </button>
            <button type="button" className="hover:text-ink">
              About Us
            </button>
          </div>
          {isAuthed ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-1.5 rounded-full border border-border-soft bg-white/90 px-2 py-1 text-ink transition duration-150 ease-out hover:border-ink-muted hover:-translate-y-[1px] hover:shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                <div className="h-8 w-8 rounded-full border border-border bg-accent-primary/10 text-accent-primary grid place-items-center overflow-hidden">
                  {avatarUrl && !avatarFailed ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <span className="text-[11px] font-bold uppercase">{displayName?.[0] ?? "U"}</span>
                  )}
                </div>
                <ChevronDown size={14} className="text-ink-muted" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-white shadow-lg p-1 z-50"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      handleNavigate("/user");
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-gray-100"
                  >
                    <User size={16} />
                    Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      handleNavigate("/settings");
                    }}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-gray-100"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavigate(ctaPath)}
                className="text-sm font-semibold text-ink-muted transition hover:text-ink"
              >
                {secondaryCtaLabel}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate(ctaPath)}
                className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
              >
                {primaryCtaLabel}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_0%,rgba(56,189,248,0.18),rgba(249,250,251,0))]" />
          <div className="absolute -right-24 top-24 h-72 w-72 rounded-full bg-gradient-to-br from-sky-200 via-white to-emerald-100 opacity-80 blur-3xl" />
          <div className="absolute -left-32 bottom-[-120px] h-80 w-80 rounded-full bg-gradient-to-br from-amber-100 via-white to-sky-100 opacity-70 blur-3xl" />

          <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-12 px-6 pb-4 pt-16 lg:pt-20">
            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-semibold text-sky-700">
                  <Sparkles size={14} />
                  New: Apply Assist workflows
                </div>

                <h1 className="mt-6 text-4xl font-semibold leading-tight text-ink md:text-5xl">
                  Get hired faster. Handle everything in one place.
                </h1>

                <p className="mt-4 max-w-xl text-lg text-ink-muted">
                  JobDesk365 keeps resumes, applications, interviews, and support in one place,
                  helping you move faster with less stress.
                </p>

                <img src="/images/0001.png" className="mt-2 w-full" />
              </div>

              <div className="mt-12">
                  <div className="mt-3">
                    <JobLifecycle />
                  </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 py-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div className="rounded-3xl border border-border overflow-hidden" key={feature.title}>
                  <div>
                    <img src={`images/${feature.url}.png`} className="w-full" />
                  </div>
                  <div key={feature.title} className=" bg-white p-6 shadow-soft">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
                      <Icon size={18} />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-ink">{feature.title}</h3>
                    <p className="mt-2 text-sm text-ink-muted">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 py-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl border border-border bg-slate-900 p-8 text-white shadow-soft">
              <p className="text-xs uppercase tracking-wide text-white/60">Workflow preview</p>
              <h2 className="mt-3 text-2xl font-semibold">Every request, every stage, one timeline.</h2>
              <p className="mt-3 text-sm text-white/70">
                Organize outreach, interview stages, and staffing coverage without losing context.
              </p>
              <div className="mt-6 space-y-3">
                {[
                  "Unified Hiring Timeline",
                  "End-to-End Hiring Visibility",
                  "Single Source of Truth",
                  "Context-Aware Hiring Flow"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => handleNavigate("/dashboard")}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                See Your Dashboard
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink-muted">Workspace snapshot</p>
                  <h2 className="mt-2 text-xl font-semibold text-ink">What's the benefit?</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
                  <BarChart3 size={18} />
                </div>
              </div>
              <div className="mt-5 grid gap-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between rounded-2xl border border-border/70 bg-white px-4 py-3"
                  >
                    <p className="text-sm text-ink-muted">{stat.label}</p>
                    <p className="text-lg font-semibold text-ink">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-slate-900 px-4 py-4 text-white">
                <p className="text-sm font-semibold">JobDesk365 works even better as your profiles grow</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                <p className="text-sm text-ink-muted">"{item.quote}"</p>
                <div className="mt-6">
                  <p className="text-sm font-semibold text-ink">{item.name}</p>
                  <p className="text-xs text-ink-muted">{item.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <img src="/images/logo.png" alt="JobDesk365" className="h-9 w-fit object-contain" />
            <p className="text-xs text-ink-muted">Hiring teams, calmer days.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Support</span>
            <span>Status</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
