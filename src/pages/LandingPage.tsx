import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NewProjectModal } from '../components/project/NewProjectModal';
import { 
  Rocket, 
  ShieldCheck, 
  Zap, 
  Server, 
  Terminal, 
  Cpu, 
  Globe, 
  Lock, 
  CheckCircle2, 
  ArrowRight, 
  Check, 
  Sparkles,
  HardDrive,
  Database,
  ExternalLink,
  ChevronDown,
  XCircle,
  UploadCloud,
  FileCode,
  Layers,
  HelpCircle,
  Search,
  CheckCircle
} from 'lucide-react';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'pateldeeep.me';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subdomain checker state
  const [subdomainQuery, setSubdomainQuery] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<string | null>(null);

  // Modal state for direct deploy from landing page
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [prefilledSlug, setPrefilledSlug] = useState('');
  const [prefilledType, setPrefilledType] = useState<'STATIC' | 'PHP' | 'REACT' | 'VITE'>('STATIC');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Interactive quick deployer preview tab
  const [activeRuntimeTab, setActiveRuntimeTab] = useState<'STATIC' | 'PHP' | 'VITE'>('STATIC');

  const handleSubdomainCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = subdomainQuery.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) return;

    setIsChecking(true);
    setCheckResult(null);

    setTimeout(() => {
      setIsChecking(false);
      setCheckResult(clean);
    }, 300);
  };

  const handleLaunchWithSubdomain = (slugToUse?: string, type: 'STATIC' | 'PHP' | 'REACT' | 'VITE' = 'STATIC') => {
    const slug = (slugToUse || subdomainQuery || 'my-website').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (user) {
      setPrefilledSlug(slug);
      setPrefilledType(type);
      setIsDeployModalOpen(true);
    } else {
      navigate(`/register?subdomain=${encodeURIComponent(slug)}`);
    }
  };

  const infinityFeatures = [
    {
      title: '100% Completely Free',
      desc: 'No credit card required, zero hidden charges, and no expiry date. Free forever, not a temporary trial.',
      icon: '🪙',
      badge: 'Free Forever',
    },
    {
      title: 'No Ads On Your Website',
      desc: 'Your website is 100% your own. DeployHub never injects forced banners or popups onto your visitor pages.',
      icon: '🚫',
      badge: 'Zero Ads',
    },
    {
      title: `Free Subdomains on ${PLATFORM_DOMAIN}`,
      desc: `Get instant live addresses like yourname.${PLATFORM_DOMAIN} or connect your custom domain with 1-click CNAME.`,
      icon: '🌐',
      badge: `*.${PLATFORM_DOMAIN}`,
    },
    {
      title: 'Instant 5-Second Setup',
      desc: 'No waiting list or manual approval queues. Create your project, drag-and-drop your ZIP archive, and go live instantly.',
      icon: '⚡',
      badge: 'Instant Activation',
    },
    {
      title: 'Real PHP 8.4 Isolated Runtime',
      desc: 'Support for full PHP applications with isolated container runtimes, non-root execution, and .htaccess capability.',
      icon: '🐘',
      badge: 'PHP-FPM Sandbox',
    },
    {
      title: 'Free Let\'s Encrypt SSL',
      desc: 'Automated HTTPS protection and green padlock certificates for all subdomains and custom domains.',
      icon: '🔒',
      badge: 'Automated HTTPS',
    },
  ];

  const hostingSpecs = [
    '5 GB Fast SSD Storage',
    'Unlimited Bandwidth / Month',
    'PHP 8.4 Isolated Execution',
    'Static HTML/CSS/JS Fast CDN',
    'React & Vite SPA Output Support',
    `Free *.${PLATFORM_DOMAIN} Subdomain`,
    'Custom Domain (CNAME) Support',
    'Free Automated SSL (HTTPS)',
    'Real-time Build & Deployment Logs',
    'ZIP Bomb & Security Screening',
    'One-Click Instant Rollbacks',
    'Zero Forced Ads On User Sites'
  ];

  const steps = [
    {
      step: '1',
      title: 'Claim Your Subdomain',
      desc: `Pick your unique address on ${PLATFORM_DOMAIN} (e.g. portfolio.${PLATFORM_DOMAIN}) or bring your own domain.`,
      icon: Globe,
    },
    {
      step: '2',
      title: 'Upload Project or ZIP',
      desc: 'Drag & drop your static files, React/Vite dist folder, or PHP scripts directly into our secure web uploader.',
      icon: UploadCloud,
    },
    {
      step: '3',
      title: 'Instant Global Live URL',
      desc: 'Our isolated edge worker validates your code, provisions SSL, and publishes your site worldwide in 5 seconds.',
      icon: Rocket,
    },
  ];

  const audienceCards = [
    {
      title: 'Students & Learners',
      desc: 'Learn web development with real hosting. Practice HTML, CSS, JavaScript, and PHP without paying for hosting.',
      icon: '🎓',
    },
    {
      title: 'Personal Portfolios',
      desc: `Showcase your resumes, projects, and client work with a clean, branded public URL on ${PLATFORM_DOMAIN}.`,
      icon: '💼',
    },
    {
      title: 'Testing & Staging',
      desc: 'Test ideas, preview client revisions, or stage web builds before pushing to expensive cloud servers.',
      icon: '🧪',
    },
    {
      title: 'Small Businesses & Creators',
      desc: 'Get your company, community club, or passion project online with zero monthly overhead costs.',
      icon: '🚀',
    },
  ];

  const faqs = [
    {
      q: 'Is DeployHub really 100% free?',
      a: `Yes! Our Free Starter tier provides 5 GB disk storage, unlimited bandwidth, free subdomains on ${PLATFORM_DOMAIN}, automated SSL, and PHP/Static hosting without requiring any credit card.`
    },
    {
      q: `How do subdomains work on ${PLATFORM_DOMAIN}?`,
      a: `When you create a project named 'my-site', DeployHub automatically reserves and routes https://my-site.${PLATFORM_DOMAIN} to your deployment files. Wildcard DNS and edge proxies route requests instantly.`
    },
    {
      q: 'Will you place advertisements on my deployed websites?',
      a: 'Never. Your website belongs to you. We do not inject banners, popups, or scripts into your visitor traffic.'
    },
    {
      q: 'Can I host PHP and MySQL websites?',
      a: 'Yes. DeployHub features an isolated PHP runtime environment running PHP 8.4 with non-root security boundaries and sandbox isolation.'
    },
    {
      q: 'Can I connect my own custom domain?',
      a: `Yes. You can add your own domain (e.g. www.yourdomain.com) and point a CNAME record to cname.${PLATFORM_DOMAIN}. Automated SSL certificates are provisioned for verified domains.`
    },
  ];

  return (
    <div className="min-h-screen bg-background text-deployText selection:bg-primary selection:text-white">
      
      {/* Top Banner Notice (InfinityFree style) */}
      <div className="bg-gradient-to-r from-primary/90 to-accent/90 text-white text-xs font-semibold py-2 px-4 text-center flex items-center justify-center space-x-2">
        <Sparkles className="w-4 h-4 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
        <span>Completely Free Web Hosting with PHP, MySQL & Static Deployments on <strong>{PLATFORM_DOMAIN}</strong></span>
        <span className="hidden md:inline">• No Credit Card Required</span>
      </div>

      {/* Navigation */}
      <nav className="border-b border-deployBorder bg-surface/85 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center">
                Deploy<span className="text-accent">Hub</span>
              </span>
              <span className="hidden sm:block text-[10px] text-deployText-secondary tracking-widest uppercase font-medium -mt-1">
                Free Hosting on {PLATFORM_DOMAIN}
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center space-x-7 text-sm font-medium text-deployText-secondary">
            <a href="#claim-subdomain" className="hover:text-white transition-colors text-accent font-semibold flex items-center space-x-1">
              <span>Free Subdomains</span>
            </a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#specs" className="hover:text-white transition-colors">Hosting Specs</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare Plans</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <Link 
                to="/dashboard" 
                className="text-xs sm:text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl shadow-glow-primary transition-all"
              >
                Go to Client Area
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-xs sm:text-sm font-medium text-deployText-secondary hover:text-white px-3 py-1.5 transition-colors">
                  Client Login
                </Link>
                <Link to="/register" className="text-xs sm:text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl shadow-glow-primary transition-all">
                  Create Free Account
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/20 blur-[140px] rounded-full pointer-events-none -z-10" />
        <div className="absolute top-40 right-1/4 w-[350px] h-[250px] bg-accent/15 blur-[100px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-card border border-deployBorder text-xs font-semibold text-accent shadow-inner">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Free Web Hosting & Instant Deployment Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Free Website Hosting. <br />
            <span className="bg-gradient-to-r from-primary-light via-accent to-white bg-clip-text text-transparent">
              No Ads. Free Subdomains. Free SSL.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-deployText-secondary leading-relaxed">
            Host your Static HTML/CSS/JS, React, Vite, and PHP websites with free subdomains on <span className="text-white font-semibold">*.{PLATFORM_DOMAIN}</span>. No credit card, no expiration date, and 100% ad-free on your websites.
          </p>

          {/* Interactive Subdomain Claimer Bar (InfinityFree Inspired) */}
          <div id="claim-subdomain" className="max-w-2xl mx-auto pt-4">
            <form onSubmit={handleSubdomainCheck} className="bg-surface/90 border border-deployBorder p-2 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center flex-1 w-full px-3 py-2 bg-card rounded-xl border border-deployBorder/60">
                <span className="text-xs text-deployText-muted font-mono mr-1 hidden sm:inline">https://</span>
                <input
                  type="text"
                  value={subdomainQuery}
                  onChange={(e) => {
                    setSubdomainQuery(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                    setCheckResult(null);
                  }}
                  placeholder="enter-your-subdomain"
                  className="bg-transparent text-sm text-white font-mono placeholder-deployText-muted w-full outline-none"
                />
                <span className="text-xs font-mono font-bold text-accent shrink-0">.{PLATFORM_DOMAIN}</span>
              </div>

              <button
                type="submit"
                disabled={isChecking}
                className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-xl shadow-glow-primary transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>{isChecking ? 'Checking...' : 'Check Availability'}</span>
              </button>
            </form>

            {/* Check Result Feedback */}
            {checkResult && (
              <div className="mt-3 p-3.5 rounded-xl bg-success/10 border border-success/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center space-x-2 text-success">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Great news! <strong className="font-mono text-white">{checkResult}.{PLATFORM_DOMAIN}</strong> is available for free!
                  </span>
                </div>
                <button
                  onClick={() => handleLaunchWithSubdomain(checkResult)}
                  className="bg-success hover:bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center space-x-1 cursor-pointer shrink-0"
                >
                  <span>Claim & Deploy Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-xs text-deployText-secondary mt-3">
              ⚡ No credit card required. Free forever with automated Let's Encrypt SSL.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleLaunchWithSubdomain()}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover text-white text-sm sm:text-base font-semibold px-7 py-3 rounded-xl shadow-glow-primary transition-all active:scale-95 cursor-pointer"
            >
              <span>Create Free Account & Deploy</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#compare"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-card hover:bg-deployBorder text-deployText text-sm sm:text-base font-semibold px-7 py-3 rounded-xl border border-deployBorder transition-all"
            >
              <span>Compare with Premium</span>
            </a>
          </div>
        </div>

        {/* InfinityFree-Style Metric Stat Badges */}
        <div className="max-w-5xl mx-auto mt-16 bg-surface/70 border border-deployBorder rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-deployBorder">
            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-white">100%</div>
              <p className="text-xs text-deployText-secondary mt-1 font-medium">Free Forever (No Trial)</p>
            </div>
            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-accent">5 GB</div>
              <p className="text-xs text-deployText-secondary mt-1 font-medium">Fast SSD Storage, Free</p>
            </div>
            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400">Unlimited</div>
              <p className="text-xs text-deployText-secondary mt-1 font-medium">Monthly Bandwidth</p>
            </div>
            <div className="pt-2 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-white">99.9%</div>
              <p className="text-xs text-deployText-secondary mt-1 font-medium">High Uptime Reliability</p>
            </div>
          </div>
        </div>

        {/* Live Interactive Quick Deployer Preview */}
        <div className="max-w-4xl mx-auto mt-12 bg-surface/90 border border-deployBorder rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-deployBorder gap-3">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-white">Instant Web Deployer & Sandbox</h3>
              </div>
              <p className="text-xs text-deployText-secondary mt-0.5">Select a runtime to test how DeployHub packages your website</p>
            </div>
            
            <div className="flex items-center space-x-1 bg-card p-1 rounded-xl border border-deployBorder">
              {(['STATIC', 'PHP', 'VITE'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveRuntimeTab(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    activeRuntimeTab === t
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-deployText-secondary hover:text-white'
                  }`}
                >
                  {t === 'STATIC' ? 'HTML / CSS / JS' : t === 'PHP' ? 'PHP 8.4 Sandbox' : 'React / Vite'}
                </button>
              ))}
            </div>
          </div>

          {/* Runtime Dropzone Showcase */}
          <div className="py-8">
            <div 
              onClick={() => handleLaunchWithSubdomain(undefined, activeRuntimeTab)}
              className="border-2 border-dashed border-deployBorder hover:border-primary/60 rounded-2xl p-8 text-center bg-card/40 hover:bg-card/70 transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-glow-primary">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">
                Drop your {activeRuntimeTab === 'PHP' ? 'PHP project or index.php' : activeRuntimeTab === 'VITE' ? 'Vite project or build dist' : 'HTML/CSS/JS files or ZIP'} here
              </h4>
              <p className="text-xs text-deployText-secondary max-w-md mx-auto mb-4">
                DeployHub extracts, validates MIME types, scans for security hazards, and binds your site to an edge subdomain in under 5 seconds.
              </p>
              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl shadow-glow-primary">
                <span>Deploy with One Click</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Terminal output simulation */}
          <div className="bg-[#0B1120] border border-deployBorder rounded-xl p-4 font-mono text-xs text-deployText-secondary space-y-1">
            <div className="text-accent flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>[12:00:01] Edge worker initialized for runtime: {activeRuntimeTab}</span>
            </div>
            <div>[12:00:02] Security inspection passed: Path traversal blocked, safe archives verified</div>
            <div>[12:00:03] Binding reverse proxy routing to *.{PLATFORM_DOMAIN}</div>
            <div className="text-success font-semibold flex items-center space-x-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>[12:00:05] 🎉 Website is LIVE at https://demo.{PLATFORM_DOMAIN}/</span>
            </div>
          </div>
        </div>
      </section>

      {/* Everything You Need (InfinityFree 6 Pillars) */}
      <section id="features" className="py-20 px-4 sm:px-6 border-t border-deployBorder/60 bg-surface/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Everything You Need to Get Online
            </h2>
            <p className="text-deployText-secondary text-sm sm:text-base">
              Real website hosting with PHP, MySQL, static files, and automated SSL — free for your developers, students, and businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {infinityFeatures.map((feat, idx) => (
              <div
                key={idx}
                className="bg-card/70 hover:bg-card border border-deployBorder hover:border-primary/50 rounded-2xl p-6 transition-all duration-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl p-2.5 rounded-xl bg-surface border border-deployBorder">
                      {feat.icon}
                    </span>
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-accent border border-accent/20">
                      {feat.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-deployText-secondary leading-relaxed">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Online in 3 Simple Steps */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 border-t border-deployBorder">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Get Online in 3 Simple Steps
            </h2>
            <p className="text-deployText-secondary text-sm sm:text-base">
              No technical expertise required. Go from raw code to a live public website in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((st, idx) => {
              const Icon = st.icon;
              return (
                <div key={idx} className="relative bg-card/60 border border-deployBorder rounded-2xl p-7 text-center hover:border-primary/50 transition-all">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-white text-lg font-extrabold flex items-center justify-center shadow-glow-primary">
                    {st.step}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{st.title}</h3>
                  <p className="text-xs sm:text-sm text-deployText-secondary leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Free Hosting Specifications Checklist (InfinityFree Style) */}
      <section id="specs" className="py-20 px-4 sm:px-6 border-t border-deployBorder/60 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-accent font-mono">
                  Full Hosting Specifications
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                  Everything Included in Free Hosting
                </h2>
                <p className="text-deployText-secondary text-sm sm:text-base mt-2">
                  DeployHub includes every tool you could possibly need to build, test, and host your websites on {PLATFORM_DOMAIN}.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {hostingSpecs.map((item, idx) => (
                  <div key={idx} className="flex items-center space-x-2.5 bg-card/60 border border-deployBorder/80 rounded-xl px-3.5 py-2.5 text-xs text-deployText">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PHP & WordPress Highlight Card (Like InfinityFree) */}
            <div className="lg:col-span-5 bg-gradient-to-b from-card to-surface border border-deployBorder rounded-2xl p-7 shadow-xl">
              <div className="inline-block p-2 rounded-xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20">
                <FileCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Host PHP & WordPress Free</h3>
              <p className="text-xs sm:text-sm text-deployText-secondary leading-relaxed mb-6">
                With native support for PHP 8.4 and sandboxed execution, DeployHub is the perfect place to run PHP scripts, contact forms, or WordPress sites without paying a penny.
              </p>
              
              <button
                onClick={() => handleLaunchWithSubdomain(undefined, 'PHP')}
                className="w-full bg-primary hover:bg-primary-hover text-white text-sm font-bold py-3 rounded-xl shadow-glow-primary transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Deploy PHP Website Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Perfect For Section */}
      <section className="py-20 px-4 sm:px-6 border-t border-deployBorder">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Perfect For Every Creator</h2>
            <p className="text-deployText-secondary text-sm sm:text-base">
              Whether you are building your first website or testing client applications, DeployHub scales with your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {audienceCards.map((aud, idx) => (
              <div key={idx} className="bg-card border border-deployBorder rounded-2xl p-6 text-center hover:border-primary/50 transition-all">
                <div className="text-3xl mb-3">{aud.icon}</div>
                <h3 className="text-base font-bold text-white mb-1.5">{aud.title}</h3>
                <p className="text-xs text-deployText-secondary leading-relaxed">{aud.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare Free vs Premium (InfinityFree Style Comparison Table) */}
      <section id="compare" className="py-24 px-4 sm:px-6 border-t border-deployBorder/60 bg-surface/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Compare Hosting Plans</h2>
            <p className="text-deployText-secondary text-sm sm:text-base">
              Transparent features. Start on 100% free hosting and upgrade only when you need custom domains and priority build workers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-card border border-deployBorder rounded-2xl overflow-hidden shadow-2xl">
              <thead>
                <tr className="border-b border-deployBorder bg-surface">
                  <th className="py-4 px-6 text-xs font-bold text-deployText-secondary uppercase">Plan Features</th>
                  <th className="py-4 px-6 text-xs font-bold text-accent uppercase">
                    Free Starter (₹0)
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-white uppercase">
                    Developer (₹149/mo)
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-primary-light uppercase">
                    Pro Cloud (₹399/mo)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deployBorder text-xs text-deployText">
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Price per month</td>
                  <td className="py-3.5 px-6 font-bold text-accent">₹0 (Free Forever)</td>
                  <td className="py-3.5 px-6 font-semibold">₹149 / mo</td>
                  <td className="py-3.5 px-6 font-semibold">₹399 / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Allowed Projects</td>
                  <td className="py-3.5 px-6">3 Active Projects</td>
                  <td className="py-3.5 px-6">20 Active Projects</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">Unlimited Projects</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Fast SSD Disk Storage</td>
                  <td className="py-3.5 px-6">500 MB (Up to 5 GB)</td>
                  <td className="py-3.5 px-6">10 GB SSD</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">50 GB SSD</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Monthly Bandwidth</td>
                  <td className="py-3.5 px-6">5 GB / Unlimited</td>
                  <td className="py-3.5 px-6">100 GB / month</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">500 GB / month</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Free Subdomains on {PLATFORM_DOMAIN}</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Included</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Custom Domains (yourdomain.com)</td>
                  <td className="py-3.5 px-6 text-deployText-muted">— (Upgrade)</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Automated SSL (HTTPS)</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Let's Encrypt</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Let's Encrypt</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Priority SSL</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">Ads on Visitor Websites</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">Zero Ads (100% Clean)</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">Zero Ads</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-400">Zero Ads</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold">PHP 8.4 Isolated Runtime</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-400">✓ High Concurrency</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 border-t border-deployBorder">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-deployText-secondary text-sm">Everything you need to know about hosting on {PLATFORM_DOMAIN}</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-card border border-deployBorder rounded-xl overflow-hidden transition-colors">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-4 px-6 text-left flex items-center justify-between text-sm font-bold text-white hover:text-accent transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-deployText-secondary transition-transform ${isOpen ? 'rotate-180 text-accent' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 text-xs sm:text-sm text-deployText-secondary leading-relaxed border-t border-deployBorder/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-20 px-4 sm:px-6 border-t border-deployBorder bg-gradient-to-b from-card/80 to-surface">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white">
            Get Your Website Online in Seconds
          </h2>
          <p className="max-w-xl mx-auto text-sm sm:text-base text-deployText-secondary">
            Join developers hosting their projects, portfolios, and PHP websites for free on {PLATFORM_DOMAIN}.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleLaunchWithSubdomain()}
              className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-white text-base font-bold px-8 py-3.5 rounded-xl shadow-glow-primary transition-all active:scale-95 cursor-pointer"
            >
              Start Free Hosting Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-deployBorder bg-surface py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-deployText-secondary">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold">
              <Rocket className="w-4 h-4" />
            </div>
            <span className="text-white font-bold text-sm">DeployHub</span>
            <span>• Free Web Hosting on {PLATFORM_DOMAIN}</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <a href="#claim-subdomain" className="hover:text-white transition-colors">Free Subdomains</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#specs" className="hover:text-white transition-colors">Hosting Specs</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare Plans</a>
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
          </div>

          <div>
            © {new Date().getFullYear()} DeployHub • Free Web Hosting Infrastructure. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Quick Deploy Modal (Accessible when logged in) */}
      <NewProjectModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        onSuccess={(newProject) => {
          setIsDeployModalOpen(false);
          navigate(`/projects/${newProject._id}`);
        }}
        initialSlug={prefilledSlug}
        initialName={prefilledSlug}
        initialType={prefilledType}
      />

    </div>
  );
};
