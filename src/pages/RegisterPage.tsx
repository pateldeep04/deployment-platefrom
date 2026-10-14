import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  KeyRound,
  ArrowLeft
} from 'lucide-react';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'deployeai.duckdns.org';

export const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<'REGISTER' | 'VERIFY'>('REGISTER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Verification state
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(60);

  const { register, verifyEmail, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const claimedSubdomain = searchParams.get('subdomain');

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: any;
    if (step === 'VERIFY' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

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
      const res = await register(name.trim(), email.trim(), password);
      if (res.requiresVerification) {
        setStep('VERIFY');
        setCountdown(60);
      } else {
        if (claimedSubdomain) {
          navigate(`/dashboard?subdomain=${encodeURIComponent(claimedSubdomain)}`);
        } else {
          navigate('/dashboard');
        }
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 4) {
      setError('Please enter the verification code sent to your email.');
      return;
    }

    setError(null);
    setIsVerifying(true);

    try {
      await verifyEmail(email.trim(), otpCode.trim());
      if (claimedSubdomain) {
        navigate(`/dashboard?subdomain=${encodeURIComponent(claimedSubdomain)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      setError(serverError || err.message || 'Invalid verification code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || isResending) return;
    setError(null);
    setResendSuccess(null);
    setIsResending(true);

    try {
      await resendVerification(email.trim());
      setResendSuccess('A new 6-digit code has been sent to your email.');
      setCountdown(60);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none bg-grid-pattern-light">
      {/* Subtle ambient light gradient glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-100/50 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-50 rounded-full blur-[110px] pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-6">
        <Link to="/" className="inline-flex items-center space-x-3 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Deploy<span className="text-blue-600">Hub</span>
          </span>
        </Link>
        <h1 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {step === 'REGISTER' ? 'Create Developer Account' : 'Verify Email Address'}
        </h1>
        <p className="mt-1.5 text-xs text-slate-500">
          {step === 'REGISTER'
            ? 'Join free and host your HTML, CSS, JS or PHP web applications in seconds'
            : `We sent a 6-digit security code to ${email}`}
        </p>
      </div>

      {/* Main Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 w-full">
        <div className="bg-white border border-slate-200 py-8 px-6 sm:px-8 shadow-sm rounded-2xl relative">
          
          {step === 'REGISTER' ? (
            <>
              {/* Sign In / Register Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 mb-6">
                <Link
                  to="/login"
                  className="flex-1 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-all text-center"
                >
                  Sign In
                </Link>
                <button
                  type="button"
                  className="flex-1 py-2 text-xs font-bold rounded-lg bg-white text-blue-600 shadow-2xs transition-all text-center"
                >
                  Create Account
                </button>
              </div>

              {/* Subdomain Reservation Banner */}
              {claimedSubdomain && (
                <div className="mb-5 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center space-x-2.5 text-xs text-blue-700">
                  <Globe className="w-4 h-4 shrink-0 text-blue-600 animate-pulse" />
                  <span>
                    Reserving subdomain: <strong className="font-mono text-blue-900">{claimedSubdomain}.{PLATFORM_DOMAIN}</strong>
                  </span>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="mb-4 flex items-start space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">
                    {error}
                    {error.toLowerCase().includes('already') && (
                      <Link to="/login" className="block mt-1 font-bold text-blue-600 hover:underline">
                        Already have an account? Sign in here →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Deep Patel"
                      autoComplete="name"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Email Address
                    </label>
                    <span className="text-[10px] text-blue-600 font-medium">
                      One account per email ID
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="email"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Each email ID can only be used once to create an account.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="flex items-start space-x-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 w-3.5 h-3.5 mt-0.5 cursor-pointer"
                    />
                    <span>
                      I agree to the <Link to="/docs" className="text-blue-600 hover:underline font-semibold">Terms of Service</Link> and <Link to="/docs" className="text-blue-600 hover:underline font-semibold">Acceptable Use Policy</Link>.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl shadow-sm transition-all cursor-pointer mt-3"
                >
                  <span>{isLoading ? 'Sending Security Code...' : 'Create Account & Verify Email'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            /* OTP VERIFICATION STEP */
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center space-x-3 text-xs text-blue-700">
                <KeyRound className="w-5 h-5 text-blue-600 shrink-0" />
                <span>
                  A 6-digit confirmation code was sent to <strong className="text-blue-950 font-mono">{email}</strong>
                </span>
              </div>

              {error && (
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{error}</div>
                </div>
              )}

              {resendSuccess && (
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{resendSuccess}</div>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white focus:ring-1 focus:ring-blue-600 rounded-xl py-3 text-slate-900 placeholder-slate-400 outline-none transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-1.5">
                    Valid for 15 minutes. Check spam or junk folder if not in inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || otpCode.length < 4}
                  className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-3 rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Enter Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('REGISTER');
                      setError(null);
                    }}
                    className="text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>

                  <button
                    type="button"
                    disabled={countdown > 0 || isResending}
                    onClick={handleResendCode}
                    className="text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline font-semibold"
                  >
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Switch to Login footer */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-bold">
                Sign in to Console →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-500 z-10">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Free 3 Hosted Websites</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center space-x-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>Full Online File Manager & cPanel</span>
        </div>
        <span className="text-slate-300">•</span>
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          <span>Automatic Free HTTPS / SSL</span>
        </div>
      </div>
    </div>
  );
};
