import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Rocket,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  Globe,
  KeyRound,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'PASSWORD' | 'EMAIL_OTP'>('PASSWORD');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // OTP state
  const [otpStep, setOtpStep] = useState<'ENTER_EMAIL' | 'ENTER_CODE'>('ENTER_EMAIL');
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, sendLoginOtp, verifyLoginOtp, verifyEmail } = useAuth();
  const navigate = useNavigate();

  // Password submission
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.data?.requiresVerification) {
        // Switch to OTP verification mode if user needs email verification
        setAuthMode('EMAIL_OTP');
        setOtpStep('ENTER_CODE');
        setError('Your email requires verification. A 6-digit code has been sent to your email.');
      } else {
        const serverError = err.response?.data?.error;
        const msg =
          serverError ||
          (err.response?.status === 500
            ? 'Server is temporarily initializing. Please retry in a few moments.'
            : err.message || 'Invalid email or password');
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Request Email OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await sendLoginOtp(email.trim());
      setOtpMessage(res.message || 'A 6-digit code has been dispatched to your email.');
      setOtpStep('ENTER_CODE');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to dispatch code');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Email OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim().length < 4) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Try verifying login OTP first, fallback to verify email
      try {
        await verifyLoginOtp(email.trim(), otpCode.trim());
      } catch (loginErr) {
        await verifyEmail(email.trim(), otpCode.trim());
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Incorrect verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-deployText flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[110px] pointer-events-none" />

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
          Welcome back
        </h1>
        <p className="mt-1.5 text-xs text-deployText-secondary">
          Enter your credentials to manage your hosted websites and domains
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10 w-full">
        <div className="bg-[#0e1626]/90 backdrop-blur-xl border border-[#1e293b] py-8 px-6 sm:px-8 shadow-2xl rounded-2xl relative">
          
          {/* Sign In / Register Switcher */}
          <div className="flex rounded-xl bg-[#070b14] p-1 border border-[#1e293b] mb-5">
            <button
              type="button"
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-primary text-white shadow-sm transition-all text-center"
            >
              Sign In
            </button>
            <Link
              to="/register"
              className="flex-1 py-2 text-xs font-semibold rounded-lg text-deployText-secondary hover:text-white hover:bg-card/40 transition-all text-center"
            >
              Create Account
            </Link>
          </div>

          {/* Auth Method Sub-Toggle (Password vs Email OTP) */}
          <div className="flex items-center justify-center space-x-3 mb-5 border-b border-[#1e293b] pb-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('PASSWORD');
                setError(null);
              }}
              className={`pb-1 font-semibold transition-colors cursor-pointer ${
                authMode === 'PASSWORD'
                  ? 'text-white border-b-2 border-primary'
                  : 'text-deployText-muted hover:text-white'
              }`}
            >
              Password Login
            </button>
            <span className="text-[#1e293b]">•</span>
            <button
              type="button"
              onClick={() => {
                setAuthMode('EMAIL_OTP');
                setError(null);
              }}
              className={`pb-1 font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                authMode === 'EMAIL_OTP'
                  ? 'text-accent border-b-2 border-accent'
                  : 'text-deployText-muted hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Email Code Login</span>
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-start space-x-2.5 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )}

          {/* Info Banner */}
          {otpMessage && (
            <div className="mb-4 flex items-start space-x-2.5 p-3 rounded-xl bg-primary/15 border border-primary/40 text-accent text-xs animate-in fade-in">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{otpMessage}</div>
            </div>
          )}

          {authMode === 'PASSWORD' ? (
            /* PASSWORD LOGIN FORM */
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-deployText">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('EMAIL_OTP');
                      setOtpStep('ENTER_EMAIL');
                      setError('Use the Email Code Login to sign in securely.');
                    }}
                    className="text-[11px] text-accent hover:underline cursor-pointer"
                  >
                    Login with email code?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-deployText-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
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

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-deployText-secondary cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#1e293b] bg-[#070b14] text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>Remember this session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-bold py-3 rounded-xl shadow-glow-primary hover:shadow-lg transition-all cursor-pointer mt-3"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to Console'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* EMAIL OTP LOGIN FORM */
            <div className="space-y-4 animate-in fade-in duration-200">
              {otpStep === 'ENTER_EMAIL' ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-deployText mb-1.5">
                      Your Registered Email Address
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
                        className="w-full bg-[#070b14] border border-[#1e293b] focus:border-accent focus:ring-1 focus:ring-accent rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-deployText-muted outline-none transition-all"
                      />
                    </div>
                    <p className="text-[11px] text-deployText-muted mt-1.5">
                      We'll send a one-time 6-digit authentication code to verify your identity.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full py-3 bg-accent hover:bg-accent-hover text-black font-bold text-sm rounded-xl transition-all shadow-glow-accent flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send 6-Digit Login Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-semibold text-deployText">
                        Enter 6-Digit Security Code
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpStep('ENTER_EMAIL')}
                        className="text-[11px] text-deployText-muted hover:text-white"
                      >
                        Change Email
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123456"
                      className="w-full text-center tracking-[0.5em] font-mono text-2xl bg-[#070b14] border border-[#1e293b] focus:border-accent focus:ring-1 focus:ring-accent rounded-xl py-3 text-white placeholder-deployText-muted outline-none transition-all"
                    />
                    <p className="text-[11px] text-deployText-muted text-center mt-1.5">
                      Code sent to <span className="text-white font-mono">{email}</span>
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length < 4}
                    className="w-full py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-glow-primary transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify Code & Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={isLoading}
                      className="text-xs text-accent hover:underline font-semibold"
                    >
                      Resend Login Code
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Switch to Register footer */}
          <div className="mt-6 pt-5 border-t border-[#1e293b] text-center">
            <p className="text-xs text-deployText-secondary">
              Don't have a DeployHub account yet?{' '}
              <Link to="/register" className="text-accent hover:underline font-bold">
                Create one free →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Feature Badges Footer */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-[11px] text-deployText-muted z-10">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Zero Configuration Deployment</span>
        </div>
        <span className="text-[#1e293b]">•</span>
        <div className="flex items-center space-x-1.5">
          <Globe className="w-3.5 h-3.5 text-accent" />
          <span>Automated Multi-Domain Subdomains</span>
        </div>
        <span className="text-[#1e293b]">•</span>
        <div className="flex items-center space-x-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Free Automated SSL / HTTPS</span>
        </div>
      </div>
    </div>
  );
};
