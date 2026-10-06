import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Rocket,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Check
} from 'lucide-react';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'deployeai.duckdns.org';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const claimedSubdomain = searchParams.get('subdomain');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('Please accept the developer terms to proceed.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
      if (claimedSubdomain) {
        navigate(`/dashboard?subdomain=${encodeURIComponent(claimedSubdomain)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      const msg =
        serverError ||
        (err.response?.status === 500
          ? 'Server is temporarily initializing. Please retry in a few moments.'
          : err.message || 'Registration failed');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-deployText flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-600/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-6">
        <Link to="/" className="inline-flex items-center space-x-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform duration-200">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Deploy<span className="text-accent">Hub</span>
          </span>
        </Link>
        <h1 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-white">
          Create Developer Account
        </h1>
        <p className="mt-1.5 text-xs text-deployText-secondary">
          Join free and host your HTML, CSS, JS or PHP web applications in seconds
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 w-full">
        <div className="bg-[#0e1626]/90 backdrop-blur-xl border border-[#1e293b] py-8 px-6 sm:px-8 shadow-2xl rounded-2xl relative">
          
          {/* Sign In / Register Tabs */}
          <div className="flex rounded-xl bg-[#070b14] p-1 border border-[#1e293b] mb-6">
            <Link
              to="/login"
              className="flex-1 py-2 text-xs font-semibold rounded-lg text-deployText-secondary hover:text-white hover:bg-card/40 transition-all text-center"
            >
              Sign In
            </Link>
            <button
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-primary text-white shadow-sm transition-all text-center"
            >
              Create Account
            </button>
          </div>

          {/* Subdomain Reservation Banner */}
          {claimedSubdomain && (
            <div className="mb-5 p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center space-x-2.5 text-xs text-accent">
              <Globe className="w-4 h-4 shrink-0 text-accent animate-pulse" />
              <span>
                Reserving subdomain: <strong className="font-mono text-white">{claimedSubdomain}.{PLATFORM_DOMAIN}</strong>
              </span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-start space-x-2.5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Registration Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-deployText mb-1.5">
                Full Name
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
                  placeholder="Deep Patel"
                  autoComplete="name"
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
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-deployText mb-1.5">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-deployText-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                  className="w-full bg-[#070b14] border border-[#1e293b] focus:border-primary focus:ring-1 focus:ring-primary rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-deployText-muted hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-start space-x-2 text-xs text-deployText-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="rounded border-[#1e293b] bg-[#070b14] text-primary focus:ring-0 w-3.5 h-3.5 mt-0.5 cursor-pointer"
                />
                <span>
                  I agree to the <Link to="/docs" className="text-accent hover:underline">Terms of Service</Link> and <Link to="/docs" className="text-accent hover:underline">Acceptable Use Policy</Link>.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl shadow-glow-primary hover:shadow-lg transition-all cursor-pointer mt-3"
            >
              <span>{isLoading ? 'Creating Account...' : 'Create Account & Get Started'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch to Login footer */}
          <div className="mt-6 pt-5 border-t border-[#1e293b] text-center">
            <p className="text-xs text-deployText-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-accent hover:underline font-bold">
                Sign in to Console →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[11px] text-deployText-muted z-10">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Free 3 Hosted Websites</span>
        </div>
        <span className="text-[#1e293b]">•</span>
        <div className="flex items-center space-x-1.5">
          <Globe className="w-3.5 h-3.5 text-accent" />
          <span>Full Online File Manager & cPanel</span>
        </div>
        <span className="text-[#1e293b]">•</span>
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Automatic Free HTTPS / SSL</span>
        </div>
      </div>
    </div>
  );
};
