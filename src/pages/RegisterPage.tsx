import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, Lock, Mail, User as UserIcon, AlertCircle, ArrowRight, Globe } from 'lucide-react';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN || 'pateldeeep.in';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const claimedSubdomain = searchParams.get('subdomain');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await register(name, email, password);
      if (claimedSubdomain) {
        navigate(`/dashboard?subdomain=${encodeURIComponent(claimedSubdomain)}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Deploy<span className="text-accent">Hub</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Create your developer account</h2>
        <p className="mt-1 text-xs text-deployText-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-deployBorder py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {claimedSubdomain && (
            <div className="mb-5 p-3 rounded-xl bg-primary/15 border border-primary/30 flex items-center space-x-2.5 text-xs text-accent">
              <Globe className="w-4 h-4 shrink-0" />
              <span>
                Reserving subdomain: <strong className="font-mono text-white">{claimedSubdomain}.{PLATFORM_DOMAIN}</strong>
              </span>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-error/15 border border-error/30 text-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-deployText-muted">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Connor"
                  className="w-full bg-card border border-deployBorder focus:border-primary rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-deployText-muted outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-deployText-muted">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@example.com"
                  className="w-full bg-card border border-deployBorder focus:border-primary rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-deployText-muted outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                Password (min 8 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-deployText-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-card border border-deployBorder focus:border-primary rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-deployText-muted outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-lg shadow-glow-primary transition-all cursor-pointer mt-2"
            >
              <span>{isLoading ? 'Creating Account...' : 'Get Started Free'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
