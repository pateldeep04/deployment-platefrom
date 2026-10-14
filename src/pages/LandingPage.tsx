import React, { useState, useEffect } from 'react';
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
  HardDrive,
  Database,
  ExternalLink,
  ChevronDown,
  UploadCloud,
  FileCode,
  Layers,
  Search,
  CheckCircle,
  AlertCircle,
  Code2,
  Activity,
  FolderTree
} from 'lucide-react';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'deployeai.duckdns.org';

export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Subdomain checker state
  const [subdomainQuery, setSubdomainQuery] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    subdomain: string;
    isAvailable: boolean;
    reason?: string;
    suggestions?: string[];
  } | null>(null);

  // Modal state for direct deploy from landing page
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [prefilledSlug, setPrefilledSlug] = useState('');
  const [prefilledType, setPrefilledType] = useState<'STATIC' | 'PHP' | 'REACT' | 'VITE'>('STATIC');

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Interactive quick deployer preview tab
  const [activeRuntimeTab, setActiveRuntimeTab] = useState<'STATIC' | 'PHP' | 'VITE'>('STATIC');

  // Dynamic Plan Pricing from API
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/v1/billing/plans')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data?.plans) {
          setPlans(json.data.plans);
        }
      })
      .catch(() => {});
  }, []);

  const devPlan = plans.find(p => p.id === 'DEVELOPER');
  const devPriceINR = devPlan ? devPlan.priceINR : 30;
  const proPlan = plans.find(p => p.id === 'PRO');
  const proPriceINR = proPlan ? proPlan.priceINR : 399;

  const handleSubdomainCheck = async (e?: React.FormEvent, customSub?: string) => {
    if (e) e.preventDefault();
    const target = customSub !== undefined ? customSub : subdomainQuery;
    const clean = target.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) return;

    setIsChecking(true);
    setCheckResult(null);

    try {
      const res = await fetch(`/api/v1/subdomains/check?subdomain=${encodeURIComponent(clean)}&domain=${encodeURIComponent(PLATFORM_DOMAIN)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCheckResult({
          subdomain: clean,
          isAvailable: json.data.isAvailable,
          reason: json.data.reason,
          suggestions: json.data.suggestions || [],
        });
      } else {
        setCheckResult({
          subdomain: clean,
          isAvailable: false,
          reason: json.error || 'Subdomain is not available',
          suggestions: json.suggestions || [],
        });
      }
    } catch {
      // Offline fallback check
      setCheckResult({
        subdomain: clean,
        isAvailable: true,
        suggestions: [],
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSelectSuggestion = (sug: string) => {
    setSubdomainQuery(sug);
    setCheckResult({
      subdomain: sug,
      isAvailable: true,
      suggestions: [],
    });
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

  const platformFeatures = [
    {
      title: '100% Free Forever',
      desc: 'No credit card required, zero hidden charges, and no expiration date. A permanent free starter tier for developers.',
      icon: Zap,
      badge: 'Free Forever',
    },
    {
      title: 'Zero Ads on User Sites',
      desc: 'Your deployed website belongs entirely to you. DeployHub never injects forced banners, popups, or scripts.',
      icon: ShieldCheck,
      badge: '100% Ad-Free',
    },
    {
      title: `Free Subdomains on ${PLATFORM_DOMAIN}`,
      desc: `Get instant live addresses like yourname.${PLATFORM_DOMAIN} or connect your custom domain with 1-click CNAME mapping.`,
      icon: Globe,
      badge: `*.${PLATFORM_DOMAIN}`,
    },
    {
      title: 'Instant 5-Second Deployments',
      desc: 'No queues or manual approvals. Create your project, drag-and-drop your ZIP archive, and go live worldwide instantly.',
      icon: Rocket,
      badge: 'Edge Activation',
    },
    {
      title: 'Real PHP 8.4 Isolated Runtime',
      desc: 'Full PHP runtime support with isolated container process boundaries, non-root execution, and .htaccess capability.',
      icon: Cpu,
      badge: 'PHP-FPM Sandbox',
    },
    {
      title: 'Automated Let\'s Encrypt SSL',
      desc: 'Automated TLS 1.3 HTTPS protection and verified security certificates for all subdomains and custom domains.',
      icon: Lock,
      badge: 'Automated HTTPS',
    },
  ];

  const hostingSpecs = [
    '1 GB Fast SSD Storage (Up to 3 Websites)',
    'Unlimited Monthly Bandwidth',
    'PHP 8.4 Isolated Execution',
    'Static HTML/CSS/JS Fast Edge CDN',
    'React & Vite SPA Output Support',
    `Free *.${PLATFORM_DOMAIN} Subdomain`,
    'Custom Domain (CNAME) Support',
    'Automated Let\'s Encrypt SSL (HTTPS)',
    'Real-time Build & Deployment Logs',
    'ZIP Bomb & Threat Security Screening',
    'One-Click Instant Rollbacks',
    'Zero Forced Ads on User Sites'
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Claim Your Subdomain',
      desc: `Pick your unique address on ${PLATFORM_DOMAIN} (e.g. portfolio.${PLATFORM_DOMAIN}) or bring your own domain.`,
      icon: Globe,
    },
    {
      step: '02',
      title: 'Upload Project or ZIP',
      desc: 'Drag & drop your static files, React/Vite dist folder, or PHP scripts directly into our secure web uploader.',
      icon: UploadCloud,
    },
    {
      step: '03',
      title: 'Instant Global Live URL',
      desc: 'Our isolated edge worker validates your code, provisions SSL, and publishes your site worldwide in 5 seconds.',
      icon: Server,
    },
  ];

  const audienceCards = [
    {
      title: 'Students & Learners',
      desc: 'Practice web development with real hosting. Run HTML, CSS, JavaScript, and PHP without paying for cloud servers.',
      icon: Code2,
    },
    {
      title: 'Personal Portfolios',
      desc: `Showcase your resumes, design projects, and client work with a clean, branded public URL on ${PLATFORM_DOMAIN}.`,
      icon: FolderTree,
    },
    {
      title: 'Testing & Staging',
      desc: 'Test ideas, preview client revisions, or stage web builds before pushing to expensive cloud clusters.',
      icon: Activity,
    },
    {
      title: 'Small Businesses & Creators',
      desc: 'Get your company, community club, or passion project online with zero recurring hosting costs.',
      icon: Terminal,
    },
  ];

  const faqs = [
    {
      q: 'Is DeployHub really 100% free?',
      a: `Yes! Our Free Starter tier provides 1 GB SSD storage for up to 3 active websites, unmetered bandwidth, free subdomains on ${PLATFORM_DOMAIN}, automated SSL, and PHP/Static hosting without requiring any credit card.`
    },
    {
      q: `How do subdomains work on ${PLATFORM_DOMAIN}?`,
      a: `When you create a project named 'my-site', DeployHub automatically reserves and routes https://my-site.${PLATFORM_DOMAIN} to your deployment files. Wildcard DNS and edge proxies route requests instantly.`
    },
    {
      q: 'Will you place advertisements on my deployed websites?',
      a: `To provide permanent free cloud hosting and maintain infrastructure, websites on the Free Starter tier display a modest sponsored banner. Upgrading to the Developer plan (just ₹${devPriceINR}/mo) or Pro plan completely removes all advertisements, giving your visitors a 100% clean, ad-free experience.`
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-600 selection:text-white">
      
      {/* Top Operational Status Bar */}
      <div className="bg-[#F1F5F9] border-b border-slate-200 text-xs text-slate-600 py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="font-semibold text-slate-800">System Status: All Services Operational</span>
            <span className="text-slate-300 hidden md:inline">|</span>
            <span className="text-slate-500 hidden md:inline">Global Edge Routing & PHP 8.4 Sandboxes Active</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-600 text-[11px]">
            <span>Platform Host: <strong className="text-slate-800 font-mono">{PLATFORM_DOMAIN}</strong></span>
            <Link to="/docs" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors flex items-center space-x-1">
              <span>Documentation</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Classical Navigation */}
      <nav className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                  DeployHub
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                  Cloud
                </span>
              </div>
              <span className="block text-[10px] text-slate-500 tracking-wider font-mono">
                Free Hosting on {PLATFORM_DOMAIN}
              </span>
            </div>
          </Link>

          <div className="hidden lg:flex items-center space-x-7 text-xs font-semibold text-slate-600">
            <a href="#claim-subdomain" className="hover:text-blue-600 transition-colors">Free Subdomains</a>
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
            <a href="#specs" className="hover:text-blue-600 transition-colors">Hosting Specs</a>
            <a href="#compare" className="hover:text-blue-600 transition-colors">Plans</a>
            <Link to="/domain-request" className="hover:text-blue-600 transition-colors">Domain Request & Help</Link>
            <a href="#faq" className="hover:text-blue-600 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <Link 
                to="/dashboard" 
                className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
              >
                <span>Client Area</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 transition-colors"
                >
                  Client Login
                </Link>
                <Link 
                  to="/register" 
                  className="text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-sm"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section (Clean Light Theme) */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 bg-white bg-grid-pattern-light border-b border-slate-200/90">
        <div className="max-w-6xl mx-auto text-center space-y-6">
          
          {/* Eyebrow Platform Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-slate-100 border border-slate-300 text-[11px] font-mono font-medium text-slate-700 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
            <span>FREE WEB HOSTING & INSTANT DEPLOYMENT PLATFORM</span>
          </div>

          {/* Primary Classical Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
            Free Website Hosting. <br />
            <span className="text-blue-600">
              No Ads. Free Subdomains. Free SSL.
            </span>
          </h1>

          {/* Subtitle Description */}
          <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-600 leading-relaxed">
            Host your Static HTML/CSS/JS, React, Vite, and PHP websites with free subdomains on <span className="text-slate-900 font-mono font-semibold">*.{PLATFORM_DOMAIN}</span>. No credit card, no expiration date, and 100% ad-free on your websites.
          </p>

          {/* Interactive Subdomain Claimer Console */}
          <div id="claim-subdomain" className="max-w-2xl mx-auto pt-2">
            <div className="bg-white border border-slate-300 rounded-xl p-2 shadow-lg">
              <form onSubmit={handleSubdomainCheck} className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center flex-1 w-full px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200 focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <span className="text-xs text-slate-400 font-mono mr-1 hidden sm:inline">https://</span>
                  <input
                    type="text"
                    value={subdomainQuery}
                    onChange={(e) => {
                      setSubdomainQuery(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setCheckResult(null);
                    }}
                    placeholder="enter-your-subdomain"
                    className="bg-transparent text-sm text-slate-900 font-mono placeholder-slate-400 w-full outline-none"
                  />
                  <span className="text-xs font-mono font-bold text-blue-600 shrink-0">.{PLATFORM_DOMAIN}</span>
                </div>

                <button
                  type="submit"
                  disabled={isChecking}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white text-xs font-semibold px-5 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shrink-0 cursor-pointer shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isChecking ? 'Checking DNS...' : 'Check Availability'}</span>
                </button>
              </form>

              {/* Subdomain Verification Feedback */}
              {checkResult && checkResult.isAvailable && (
                <div className="mt-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in">
                  <div className="flex items-center space-x-2 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Subdomain available: <strong className="font-mono text-emerald-950 font-bold">{checkResult.subdomain}.{PLATFORM_DOMAIN}</strong>
                    </span>
                  </div>
                  <button
                    onClick={() => handleLaunchWithSubdomain(checkResult.subdomain)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 cursor-pointer shrink-0 shadow-xs"
                  >
                    <span>Claim & Deploy Free</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Subdomain Taken & Smart Available Suggestions */}
              {checkResult && !checkResult.isAvailable && (
                <div className="mt-2.5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-left text-xs space-y-2.5 animate-in fade-in">
                  <div className="flex items-start space-x-2 text-amber-900 font-medium">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span>
                        <strong className="font-mono text-amber-950">{checkResult.subdomain}.{PLATFORM_DOMAIN}</strong> is already claimed or reserved.
                      </span>
                      <div className="text-amber-800 text-[11px] font-normal mt-0.5">
                        Two users cannot own the same domain. Select one of the verified available suggestions below:
                      </div>
                    </div>
                  </div>

                  {checkResult.suggestions && checkResult.suggestions.length > 0 && (
                    <div className="pt-2 border-t border-amber-200/80">
                      <div className="text-[11px] font-mono uppercase text-amber-800 font-semibold mb-1.5">
                        Suggested Available Domains (1-Click Claim):
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {checkResult.suggestions.map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSelectSuggestion(sug)}
                            className="px-2.5 py-1.5 rounded-md bg-white hover:bg-amber-100/70 border border-amber-300 text-slate-800 font-mono text-xs font-semibold shadow-2xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <span>{sug}.{PLATFORM_DOMAIN}</span>
                            <span className="text-emerald-600 text-[11px] font-bold">✓ Select</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-600 mt-4 font-medium">
              <span className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />
                <span>No Credit Card Required</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />
                <span>100% Ad-Free Guarantee</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <Check className="w-3.5 h-3.5 text-blue-600 font-bold" />
                <span>Automated Let's Encrypt SSL</span>
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => handleLaunchWithSubdomain()}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-7 py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Create Free Account & Deploy</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#compare"
              className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold px-7 py-3 rounded-lg border border-slate-300 transition-colors flex items-center justify-center space-x-2 shadow-2xs"
            >
              <span>Compare Hosting Plans</span>
            </a>
          </div>

        </div>

        {/* Live Interactive Developer Workbench & Architecture Preview */}
        <div className="max-w-5xl mx-auto mt-12 bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xl">
          <div className="bg-slate-100 border-b border-slate-200 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
                <div className="w-3 h-3 rounded-full bg-slate-300" />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-700">
                DeployHub Workbench v2.4 · Multi-Runtime Ingress
              </span>
            </div>

            {/* Runtime Environment Selector */}
            <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-lg border border-slate-300/60">
              {(['STATIC', 'PHP', 'VITE'] as const).map((runtime) => (
                <button
                  key={runtime}
                  onClick={() => setActiveRuntimeTab(runtime)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    activeRuntimeTab === runtime
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {runtime === 'STATIC' ? 'Static HTML / JS' : runtime === 'PHP' ? 'PHP 8.4 Sandbox' : 'React / Vite SPA'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            
            {/* Left Pane: Interactive Dropzone Trigger */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-white">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-blue-600 font-bold">
                    Target Runtime: {activeRuntimeTab}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-medium">
                    Max Size: 50MB
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeRuntimeTab === 'PHP' 
                    ? 'Deploy PHP 8.4 Application' 
                    : activeRuntimeTab === 'VITE' 
                    ? 'Deploy React / Vite Production Bundle' 
                    : 'Deploy Static HTML, CSS & JavaScript'}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {activeRuntimeTab === 'PHP'
                    ? 'Upload source files, index.php, or complete PHP projects with isolated process boundaries.'
                    : activeRuntimeTab === 'VITE'
                    ? 'Upload your client dist folder or zipped production assets with automated index fallback rewrite.'
                    : 'Upload raw static web files or ZIP packages for immediate distribution across our edge proxy.'}
                </p>
              </div>

              <div 
                onClick={() => handleLaunchWithSubdomain(undefined, activeRuntimeTab)}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center bg-slate-50/70 hover:bg-blue-50/40 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="text-xs font-semibold text-slate-800 mb-1">
                  Click to select project files or drag & drop ZIP archive
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Supported: .zip, .html, .css, .js, .php, .json
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => handleLaunchWithSubdomain(undefined, activeRuntimeTab)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  <span>Launch Deployment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] text-slate-500 font-mono">
                  Deployment SLA: &lt; 5 seconds
                </span>
              </div>
            </div>

            {/* Right Pane: Live Edge Deployment Inspector */}
            <div className="lg:col-span-6 p-6 sm:p-8 bg-[#0B1120] flex flex-col justify-between font-mono text-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-slate-200 font-medium">Edge Ingress Telemetry</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/60 text-emerald-400 font-medium">
                  Worker Ready
                </span>
              </div>

              <div className="space-y-2 text-slate-400 text-[11px] leading-relaxed">
                <div className="text-slate-500 font-mono"># Infrastructure validation pipeline</div>
                <div className="flex items-start space-x-2">
                  <span className="text-slate-600">01</span>
                  <span>[DNS] Wildcard edge ingress mapping: <span className="text-blue-400">*.{PLATFORM_DOMAIN}</span></span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-slate-600">02</span>
                  <span>[SECURITY] MIME verification &amp; path traversal defense: <span className="text-emerald-400">Passed</span></span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-slate-600">03</span>
                  <span>[RUNTIME] Initializing {activeRuntimeTab === 'PHP' ? 'PHP 8.4-FPM sandbox container' : 'Nginx Static Edge Worker'}</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-slate-600">04</span>
                  <span>[CERT] Automated Let's Encrypt TLS 1.3 certificate status: <span className="text-emerald-400">Active</span></span>
                </div>
                <div className="flex items-start space-x-2 pt-1 text-emerald-400 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Route bound: https://demo.{PLATFORM_DOMAIN} (HTTP/2 200 OK)</span>
                </div>
              </div>

              {/* Infrastructure Spec Badges */}
              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <div className="text-slate-400">Security Boundary</div>
                  <div className="text-slate-200 font-semibold mt-0.5">Non-Root User Sandbox</div>
                </div>
                <div className="bg-[#111827] p-2 rounded border border-slate-800">
                  <div className="text-slate-400">Header Policy</div>
                  <div className="text-emerald-400 font-semibold mt-0.5">Zero Ad Injections</div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Enterprise Metrics Strip (Light Theme) */}
        <div className="max-w-5xl mx-auto mt-12 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-200">
            <div className="pt-2 md:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">100%</div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Free Forever (No Expiry)</p>
            </div>
            <div className="pt-2 md:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 font-mono">1 GB</div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">SSD Storage (3 Websites)</p>
            </div>
            <div className="pt-2 md:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">Unlimited</div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Monthly Bandwidth</p>
            </div>
            <div className="pt-2 md:pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">99.9%</div>
              <p className="text-xs text-slate-500 mt-1 font-semibold">High Uptime SLA</p>
            </div>
          </div>
        </div>

      </section>

      {/* Everything You Need (Pillars Grid) */}
      <section id="features" className="py-20 px-4 sm:px-6 border-b border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Core Platform Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need to Get Online
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Real website hosting with PHP, MySQL, static files, and automated SSL — free for developers, students, and businesses.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platformFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md rounded-xl p-6 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {feat.badge}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-2">{feat.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Get Online in 3 Simple Steps */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Deployment Workflow
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Get Online in 3 Simple Steps
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              No technical expertise required. Go from raw code to a live public website in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {workflowSteps.map((st, idx) => {
              const StepIcon = st.icon;
              return (
                <div key={idx} className="relative bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 sm:p-7 shadow-xs hover:border-slate-300 transition-all text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-600 text-white text-base font-bold flex items-center justify-center shadow-sm">
                    {st.step}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{st.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{st.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Free Hosting Specifications Checklist */}
      <section id="specs" className="py-20 px-4 sm:px-6 border-b border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
                  Full Hosting Specifications
                </span>
                <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-1">
                  Everything Included in Free Hosting
                </h2>
                <p className="text-slate-600 text-sm mt-2 leading-relaxed">
                  DeployHub includes every tool you could possibly need to build, test, and host your websites on {PLATFORM_DOMAIN}.
                </p>
              </div>

              {/* Data Sheet Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {hostingSpecs.map((item, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex items-center space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PHP & WordPress Highlight Card */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-7 shadow-md space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Host PHP & WordPress Free</h3>
                  <span className="text-xs font-mono text-slate-500 font-medium">Native Process Isolation</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                With native support for PHP 8.4 and sandboxed execution, DeployHub is the perfect place to run PHP scripts, contact forms, or WordPress sites without paying a penny.
              </p>

              <div className="bg-[#0B1120] border border-slate-800 rounded-lg p-3.5 font-mono text-xs text-slate-300 space-y-1">
                <div className="text-blue-400">&lt;?php</div>
                <div className="text-slate-300 pl-3">echo "Status: Running on DeployHub Cloud\n";</div>
                <div className="text-slate-300 pl-3">echo "PHP Version: " . phpversion();</div>
                <div className="text-blue-400">?&gt;</div>
              </div>

              <button
                onClick={() => handleLaunchWithSubdomain(undefined, 'PHP')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
              >
                <span>Deploy PHP Website Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* Perfect For Section */}
      <section className="py-20 px-4 sm:px-6 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Perfect For Every Creator
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Designed for Your Needs
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Whether you are building your first website or testing client applications, DeployHub scales with your needs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {audienceCards.map((aud, idx) => {
              const AudIcon = aud.icon;
              return (
                <div key={idx} className="bg-[#F8FAFC] border border-slate-200 rounded-xl p-6 shadow-xs hover:border-slate-300 transition-all text-center">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 mb-4 shadow-2xs mx-auto">
                    <AudIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">{aud.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{aud.desc}</p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Compare Free vs Premium Table */}
      <section id="compare" className="py-24 px-4 sm:px-6 border-b border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Transparent Hosting Plans
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Compare Hosting Plans
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Transparent features. Start on 100% free hosting and upgrade only when you need custom domains and priority build workers.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-4 px-6 text-xs font-mono font-bold text-slate-600 uppercase">Plan Features</th>
                  <th className="py-4 px-6 text-xs font-mono font-bold text-blue-600 uppercase bg-blue-50/50">
                    Free Starter (₹0)
                  </th>
                  <th className="py-4 px-6 text-xs font-mono font-bold text-slate-700 uppercase">
                    Developer (₹{devPriceINR}/mo)
                  </th>
                  <th className="py-4 px-6 text-xs font-mono font-bold text-slate-700 uppercase">
                    Pro Cloud (₹{proPriceINR}/mo)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Price per month</td>
                  <td className="py-3.5 px-6 font-bold text-blue-600 font-mono bg-blue-50/30">₹0 (Free Forever)</td>
                  <td className="py-3.5 px-6 font-mono font-semibold text-blue-600">₹{devPriceINR} / mo</td>
                  <td className="py-3.5 px-6 font-mono font-semibold">₹{proPriceINR} / mo</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Allowed Projects</td>
                  <td className="py-3.5 px-6 font-bold text-slate-900 bg-blue-50/30">3 Active Projects</td>
                  <td className="py-3.5 px-6">20 Active Projects</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-600">Unlimited Projects</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Fast SSD Disk Storage</td>
                  <td className="py-3.5 px-6 bg-blue-50/30">1 GB SSD (3 Sites)</td>
                  <td className="py-3.5 px-6">10 GB SSD</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-600">50 GB SSD</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Monthly Bandwidth</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-bold bg-blue-50/30">Unlimited</td>
                  <td className="py-3.5 px-6">100 GB / month</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-600">500 GB / month</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Free Subdomains on {PLATFORM_DOMAIN}</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-mono font-semibold bg-blue-50/30">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-mono font-semibold">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-mono font-semibold">✓ Included</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Custom Domains (yourdomain.com)</td>
                  <td className="py-3.5 px-6 text-slate-400 bg-blue-50/30">— (Available on Developer)</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-semibold">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-bold">✓ Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Automated SSL (HTTPS)</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-semibold bg-blue-50/30">✓ Let's Encrypt</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-semibold">✓ Let's Encrypt</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-bold">✓ Priority SSL</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Ads on Visitor Websites</td>
                  <td className="py-3.5 px-6 bg-blue-50/30">
                    <span className="inline-flex items-center text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold text-[11px]">
                      Ad-Supported (Sponsored Banner)
                    </span>
                  </td>
                  <td className="py-3.5 px-6 font-bold text-emerald-600">✓ Zero Ads (100% Ad-Free)</td>
                  <td className="py-3.5 px-6 font-bold text-emerald-600">✓ Zero Ads (100% Ad-Free)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-6 font-semibold text-slate-900">PHP 8.4 Isolated Runtime</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-semibold bg-blue-50/30">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-semibold">✓ Included</td>
                  <td className="py-3.5 px-6 text-emerald-600 font-bold">✓ Dedicated Pool</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => handleLaunchWithSubdomain()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-6 py-3 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              Start on Free Starter Tier
            </button>
          </div>

        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section id="faq" className="py-20 px-4 sm:px-6 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
              Technical Documentation & FAQ
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 text-sm">Everything you need to know about hosting on {PLATFORM_DOMAIN}</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-[#F8FAFC] border border-slate-200 rounded-lg overflow-hidden transition-colors shadow-2xs">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full py-4 px-6 text-left flex items-center justify-between text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* Final Deployment Call to Action */}
      <section className="py-20 px-4 sm:px-6 border-b border-slate-200 bg-[#F1F5F9]">
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Get Your Website Online in Seconds
          </h2>
          <p className="max-w-xl mx-auto text-sm text-slate-600 leading-relaxed">
            Join developers hosting their projects, portfolios, and PHP websites for free on {PLATFORM_DOMAIN}.
          </p>
          <div className="pt-2">
            <button
              onClick={() => handleLaunchWithSubdomain()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-7 py-3 rounded-lg transition-colors cursor-pointer shadow-sm inline-flex items-center space-x-2"
            >
              <span>Start Free Hosting Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Classical Corporate Footer (Light Theme) */}
      <footer className="bg-white py-14 px-4 sm:px-6 text-xs text-slate-500 border-t border-slate-200">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white shadow-2xs">
                <Rocket className="w-4 h-4" />
              </div>
              <span className="text-slate-900 font-bold text-sm tracking-tight">DeployHub</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Developer cloud platform providing zero-config deployments, isolated PHP sandboxes, automated SSL certificates, and free edge subdomains.
            </p>
            <div className="text-[11px] font-mono text-slate-400">
              Platform Host: {PLATFORM_DOMAIN}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-slate-900 mb-3">Platform</h4>
            <ul className="space-y-2">
              <li><a href="#claim-subdomain" className="hover:text-blue-600 transition-colors">Free Subdomains</a></li>
              <li><a href="#features" className="hover:text-blue-600 transition-colors">Features</a></li>
              <li><a href="#specs" className="hover:text-blue-600 transition-colors">Hosting Specs</a></li>
              <li><a href="#compare" className="hover:text-blue-600 transition-colors">Compare Plans</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-slate-900 mb-3">Resources</h4>
            <ul className="space-y-2">
              <li><Link to="/docs" className="hover:text-blue-600 transition-colors">Documentation</Link></li>
              <li><Link to="/domain-request" className="hover:text-blue-600 transition-colors">Domain Request & Support</Link></li>
              <li><Link to="/support" className="hover:text-blue-600 transition-colors">Help Center</Link></li>
              <li><Link to="/login" className="hover:text-blue-600 transition-colors">Client Login</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-slate-900 mb-3">Operations & Trust</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <span>Operational Uptime 99.95%</span>
              </div>
              <div className="text-slate-500 text-[11px] leading-relaxed">
                Automated Let's Encrypt TLS 1.3 certificates verified globally. Non-root Linux process isolation.
              </div>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © {new Date().getFullYear()} DeployHub Cloud Infrastructure. All rights reserved.
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/docs" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link to="/docs" className="hover:text-slate-700 transition-colors">Terms of Service</Link>
            <Link to="/support" className="hover:text-slate-700 transition-colors">Contact Support</Link>
          </div>
        </div>
      </footer>

      {/* Quick Deploy Modal */}
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
export default LandingPage;
