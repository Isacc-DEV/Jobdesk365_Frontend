import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  FileText,
  Globe2,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Wand2
} from "lucide-react";

type LandingPageProps = {
  onNavigate?: (path: string) => void;
};

const LandingPage = ({ onNavigate }: LandingPageProps) => {
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

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-page/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-primary/10 text-xs font-bold text-accent-primary">
              JD
            </div>
            <span className="text-sm font-semibold tracking-wide">JobDesk365</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <button type="button" className="hover:text-ink">
              Product
            </button>
            <button type="button" className="hover:text-ink">
              Solutions
            </button>
            <button type="button" className="hover:text-ink">
              Pricing
            </button>
            <button type="button" className="hover:text-ink">
              Resources
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNavigate("/auth")}
              className="text-sm font-semibold text-ink-muted transition hover:text-ink"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("/auth")}
              className="inline-flex items-center gap-2 rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
            >
              Get started
              <ArrowRight size={16} />
            </button>
          </div>
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

              <div className="rounded-3xl border border-border bg-white/80 p-6 shadow-soft backdrop-blur lg:mt-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">
                      Workspace snapshot
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-ink">
                      What's the benefit?
                    </h2>
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
                  <p className="text-sm font-semibold">
                    JobDesk365 works even better as your profiles grow
                  </p>
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
                  "Auto tag candidate status",
                  "Share interview packets",
                  "Track approvals by role",
                  "Alert on stalled requests"
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
              >
                See sample workspace
                <ArrowRight size={16} />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">Live activity</p>
                    <p className="mt-1 text-lg font-semibold text-ink">Recruiter queue</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <FileText size={18} />
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm text-ink-muted">
                  <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                    <span>Review 12 new profiles</span>
                    <span className="text-xs font-semibold text-ink">Today</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                    <span>Send 5 resume drafts</span>
                    <span className="text-xs font-semibold text-ink">Tomorrow</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3">
                    <span>Confirm 3 interview slots</span>
                    <span className="text-xs font-semibold text-ink">Wed</span>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-ink-muted">Pipeline health</p>
                    <p className="mt-1 text-lg font-semibold text-ink">Coverage score</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <BarChart3 size={18} />
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-border bg-white px-4 py-3">
                    <p className="text-xs text-ink-muted">Assigned recruiters</p>
                    <p className="text-lg font-semibold text-ink">84%</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white px-4 py-3">
                    <p className="text-xs text-ink-muted">Interview readiness</p>
                    <p className="text-lg font-semibold text-ink">92%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-muted">How it works</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink">Move from intake to hire faster.</h2>
              <p className="mt-4 text-sm text-ink-muted">
                Replace scattered spreadsheets with a unified flow that your team can follow from day one.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-border bg-white p-5 shadow-soft">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary/10 text-sm font-semibold text-accent-primary">
                    {index + 1}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-ink">{step.title}</h3>
                  <p className="mt-2 text-xs text-ink-muted">{step.description}</p>
                </div>
              ))}
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

        <section className="mx-auto w-full max-w-[1200px] px-6 py-16">
          <div className="flex flex-col gap-6 rounded-3xl border border-border bg-white p-8 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-muted">Pricing</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">Plans that scale with your team.</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-page px-3 py-1 text-xs text-ink-muted">
                Annual billing saves 18%
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {pricing.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-3xl border p-6 shadow-soft ${
                    tier.featured
                      ? "border-accent-primary bg-accent-primary/5"
                      : "border-border bg-white"
                  }`}
                >
                  <p className="text-sm font-semibold text-ink">{tier.name}</p>
                  <p className="mt-3 text-3xl font-semibold text-ink">{tier.price}</p>
                  <p className="mt-2 text-xs text-ink-muted">{tier.description}</p>
                  <div className="mt-4 space-y-2 text-sm text-ink-muted">
                    {tier.highlights.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <Check size={14} className="text-accent-primary" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate("/auth")}
                    className={`mt-5 w-full rounded-full px-4 py-2 text-sm font-semibold transition ${
                      tier.featured
                        ? "bg-accent-primary text-white hover:opacity-90"
                        : "border border-border bg-white text-ink hover:-translate-y-[1px] hover:shadow-soft"
                    }`}
                  >
                    Choose plan
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1200px] px-6 pb-20">
          <div className="rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-soft">
            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-semibold">Ready to streamline your hiring flow?</h2>
                <p className="mt-3 text-sm text-white/70">
                  Start with mock data, invite your team, and swap in real content whenever you are ready.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <button
                  type="button"
                  onClick={() => handleNavigate("/auth")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  Start trial
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Talk to sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent-primary/10 text-xs font-bold text-accent-primary">
              JD
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">JobDesk365</p>
              <p className="text-xs text-ink-muted">Hiring teams, calmer days.</p>
            </div>
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
