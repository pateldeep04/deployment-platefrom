import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Rocket, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      const msg = serverError || (err.response?.status === 500 
        ? 'Server is temporarily initializing or offline. Please retry in a few moments.' 
        : err.message || 'Invalid email or password');
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setIsLoading(true);
    try {
      await login(demoEmail, demoPass);
      navigate('/dashboard');
    } catch (err: any) {
      const serverError = err.response?.data?.error;
      const msg = serverError || (err.response?.status === 500 
        ? 'Server is temporarily initializing or offline. Please retry in a few moments.' 
        : err.message || 'Login failed');
      setError(msg);
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
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign in to your console</h2>
        <p className="mt-1 text-xs text-deployText-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:underline font-medium">
            Create one free
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-surface border border-deployBorder py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          
          {/* Quick 1-Click Demo Buttons */}
          <div className="mb-6 p-3 bg-card border border-deployBorder rounded-xl space-y-2">
            <span className="text-[11px] font-semibold text-deployText-secondary uppercase tracking-wider block">
              ⚡ Quick 1-Click Test Access:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('developer@deployhub.com', 'Developer2026!')}
                className="flex items-center justify-center space-x-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-white text-xs py-2 px-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-accent" />
                <span>Developer Demo</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin@deployhub.com', 'AdminDeployHub2026!')}
                className="flex items-center justify-center space-x-1.5 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-700/40 text-purple-200 text-xs py-2 px-2.5 rounded-lg transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>Admin Demo</span>
              </button>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-error/15 border border-error/30 text-error text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

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
                  placeholder="alex@deployhub.com"
                  className="w-full bg-card border border-deployBorder focus:border-primary rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-deployText-muted outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-deployText-secondary mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-deployText-muted">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
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
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
