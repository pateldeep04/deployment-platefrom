import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Rocket,
  Globe,
  Mail,
  User as UserIcon,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Send,
  FileQuestion,
  Search,
  Sparkles,
  Server,
  Layers,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

export const SupportRequestPage: React.FC = () => {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'DOMAIN_REQUEST' | 'SUPPORT_QUERY'>('DOMAIN_REQUEST');

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [type, setType] = useState<string>('DOMAIN_REQUEST');
  const [domainName, setDomainName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    type: string;
    status: string;
    createdAt: string;
  } | null>(null);

  // Ticket Lookup State
  const [lookupTicketNumber, setLookupTicketNumber] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/support/request', {
        name: name.trim(),
        email: email.trim(),
        type: activeTab,
        domainName: activeTab === 'DOMAIN_REQUEST' ? domainName.trim() : undefined,
        subject: subject.trim(),
        message: message.trim(),
      });

      if (res.data?.success) {
        setSubmittedTicket(res.data.data);
      } else {
        setError(res.data?.error || 'Failed to submit request');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTicketLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupTicketNumber.trim()) return;

    setLookupError(null);
    setLookupResult(null);
    setIsLookingUp(true);

    try {
      const res = await api.get(`/support/status/${encodeURIComponent(lookupTicketNumber.trim())}`);
      if (res.data?.success) {
        setLookupResult(res.data.data);
      } else {
        setLookupError(res.data?.error || 'Ticket not found');
      }
    } catch (err: any) {
      setLookupError(err.response?.data?.error || 'Ticket reference not found');
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-deployText flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Dynamic Background Glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-96 right-1/4 w-[400px] h-[300px] bg-accent/10 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Navigation Bar */}
      <header className="border-b border-deployBorder bg-[#0e1626]/85 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform duration-200">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center">
              Deploy<span className="text-accent">Hub</span>
            </span>
          </Link>

          <div className="flex items-center space-x-4 text-xs font-semibold">
            <Link to="/docs" className="text-deployText-secondary hover:text-white transition-colors">
              Documentation
            </Link>
            {user ? (
              <Link
                to="/dashboard"
                className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition-all shadow-glow-primary"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-deployText-secondary hover:text-white px-3 py-1.5 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-xl transition-all shadow-glow-primary"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-12 w-full flex-1">
        {/* Page Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Developer Support & Infrastructure Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Domain Requests & Helpdesk
          </h1>
          <p className="mt-2 text-sm text-deployText-secondary max-w-xl mx-auto">
            Need custom domain mapping, dedicated SSL certification, platform domain requests, or have technical queries? Submit your request below.
          </p>
        </div>

        {/* Success Modal / Card */}
        {submittedTicket ? (
          <div className="bg-[#0e1626] border border-emerald-500/40 rounded-2xl p-8 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Request Submitted Successfully!</h2>
            <p className="text-sm text-deployText-secondary max-w-md mx-auto mb-6">
              Your request has been logged into our automated routing queue. Our engineering team reviews requests within 24 hours.
            </p>

            <div className="bg-[#070b14] border border-[#1e293b] rounded-xl p-4 max-w-sm mx-auto mb-6 font-mono text-left space-y-2 text-xs">
              <div className="flex justify-between items-center text-deployText-secondary">
                <span>Ticket Number:</span>
                <span className="text-accent font-bold text-sm">{submittedTicket.ticketNumber}</span>
              </div>
              <div className="flex justify-between items-center text-deployText-secondary">
                <span>Request Type:</span>
                <span className="text-white uppercase">{submittedTicket.type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center text-deployText-secondary">
                <span>Current Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{submittedTicket.status}</span>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                onClick={() => {
                  setSubmittedTicket(null);
                  setSubject('');
                  setMessage('');
                  setDomainName('');
                }}
                className="px-5 py-2.5 rounded-xl border border-[#1e293b] text-xs font-semibold hover:bg-card/40 transition-colors"
              >
                Submit Another Request
              </button>
              <Link
                to={user ? "/dashboard" : "/"}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-primary"
              >
                Back to {user ? "Dashboard" : "Home"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Section */}
            <div className="lg:col-span-8 bg-[#0e1626]/90 backdrop-blur-xl border border-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
              {/* Tab Selector */}
              <div className="flex rounded-xl bg-[#070b14] p-1 border border-[#1e293b] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('DOMAIN_REQUEST');
                    setSubject('Custom Domain Mapping & SSL Whitelist Request');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    activeTab === 'DOMAIN_REQUEST'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-deployText-secondary hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Domain Request</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('SUPPORT_QUERY');
                    setSubject('');
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    activeTab === 'SUPPORT_QUERY'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-deployText-secondary hover:text-white'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>General Query / Support</span>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 flex items-start space-x-2.5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name & Email Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-deployText mb-1.5">
                      Your Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-deployText-muted">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-deployText mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-deployText-muted">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Domain Specific Input */}
                {activeTab === 'DOMAIN_REQUEST' && (
                  <div>
                    <label className="block text-xs font-semibold text-deployText mb-1.5">
                      Requested Domain / Subdomain FQDN
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-deployText-muted">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        placeholder="e.g. app.myorganization.org or custom.domain.com"
                        className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all font-mono"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-deployText-muted">
                      Specify the custom domain or requested platform subdomain you want provisioned or mapped.
                    </p>
                  </div>
                )}

                {/* Subject Field */}
                <div>
                  <label className="block text-xs font-semibold text-deployText mb-1.5">
                    Subject / Title
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={
                      activeTab === 'DOMAIN_REQUEST'
                        ? 'e.g. Custom Domain SSL & CNAME Provisioning'
                        : 'e.g. Inquiry regarding PHP runtime extensions'
                    }
                    className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all"
                  />
                </div>

                {/* Detailed Message */}
                <div>
                  <label className="block text-xs font-semibold text-deployText mb-1.5">
                    Detailed Message & Requirements
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      activeTab === 'DOMAIN_REQUEST'
                        ? 'Describe your project use case, DNS provider (e.g. Cloudflare, Namecheap), and desired routing settings...'
                        : 'Provide details about your query or technical issue so we can help promptly...'
                    }
                    className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3.5 text-sm text-white placeholder-deployText-muted outline-none transition-all resize-y"
                  />
                </div>

                {/* Security Verification Notice */}
                <div className="p-3 rounded-xl bg-[#070b14] border border-[#1e293b] flex items-center space-x-2.5 text-[11px] text-deployText-secondary">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Submissions are protected with end-to-end audit logging, rate limiting, and cryptographic request verification.
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-sm shadow-glow-primary transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Sidebar / Quick Info & Ticket Tracker */}
            <div className="lg:col-span-4 space-y-6">
              {/* Ticket Tracker Card */}
              <div className="bg-[#0e1626]/90 border border-[#1e293b] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center space-x-2 text-white font-bold text-sm mb-2">
                  <Search className="w-4 h-4 text-accent" />
                  <span>Track Existing Request</span>
                </div>
                <p className="text-xs text-deployText-secondary mb-3">
                  Have a ticket reference number? Enter it below to check current status.
                </p>

                <form onSubmit={handleTicketLookup} className="space-y-2.5">
                  <input
                    type="text"
                    required
                    value={lookupTicketNumber}
                    onChange={(e) => setLookupTicketNumber(e.target.value)}
                    placeholder="e.g. REQ-2026-84920"
                    className="w-full bg-[#070b14] border border-[#1e293b] rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-deployText-muted outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    disabled={isLookingUp}
                    className="w-full py-2 bg-card/60 hover:bg-card border border-[#1e293b] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <span>{isLookingUp ? 'Checking...' : 'Check Status'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {lookupError && (
                  <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-[11px]">
                    {lookupError}
                  </div>
                )}

                {lookupResult && (
                  <div className="mt-3 p-3 rounded-xl bg-[#070b14] border border-[#1e293b] text-xs space-y-1.5 font-mono animate-in fade-in">
                    <div className="flex justify-between">
                      <span className="text-deployText-muted">Ticket:</span>
                      <span className="text-accent font-bold">{lookupResult.ticketNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-deployText-muted">Status:</span>
                      <span className="text-emerald-400 font-bold uppercase">{lookupResult.status}</span>
                    </div>
                    <div className="pt-1 text-[11px] text-deployText-secondary line-clamp-2">
                      {lookupResult.subject}
                    </div>
                  </div>
                )}
              </div>

              {/* Service Level & FAQ Info */}
              <div className="bg-[#0e1626]/90 border border-[#1e293b] rounded-2xl p-5 shadow-xl space-y-4 text-xs">
                <div className="flex items-center space-x-2 text-white font-bold text-sm">
                  <Clock className="w-4 h-4 text-accent" />
                  <span>SLA & Response Time</span>
                </div>
                <div className="space-y-2.5 text-deployText-secondary">
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Domain mapping approvals: <strong>Under 12 hours</strong></span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Free quota expansions: <strong>Same day</strong></span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Technical runtime inquiries: <strong>24/7 Queue</strong></span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1e293b]">
                  <Link
                    to="/docs"
                    className="flex items-center justify-between text-accent hover:underline font-semibold"
                  >
                    <span>Read Domain Docs & Setup Guides</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] bg-[#070b14] py-6 text-center text-xs text-deployText-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <div>© {new Date().getFullYear()} DeployHub Cloud. Free Web Hosting & Edge Deployments.</div>
          <div className="flex space-x-4">
            <Link to="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link to="/support" className="text-accent font-semibold hover:underline">Support & Domain Desk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
