import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Rocket, 
  LayoutDashboard, 
  FolderKanban, 
  CreditCard, 
  BookOpen, 
  ShieldAlert, 
  Activity,
  LogOut, 
  Plus, 
  User as UserIcon,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  onOpenNewProject?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenNewProject }) => {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', path: '/projects', icon: FolderKanban },
    { name: 'Billing', path: '/billing', icon: CreditCard },
    { name: 'Docs', path: '/docs', icon: BookOpen },
    ...(isAdmin ? [{ name: 'Admin & Monitoring', path: '/admin', icon: Activity }] : []),
  ];

  const getPlanBadgeColor = (plan?: string) => {
    switch (plan) {
      case 'PRO':
        return 'bg-purple-900/60 text-purple-300 border-purple-700/50';
      case 'DEVELOPER':
        return 'bg-blue-900/60 text-blue-300 border-blue-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-deployBorder px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center">
                Deploy<span className="text-accent">Hub</span>
              </span>
              <span className="hidden sm:block text-[10px] text-deployText-secondary tracking-widest uppercase font-medium -mt-1">
                Deploy. Host. Scale.
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-deployBorder/60">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/15 text-accent border border-accent/20'
                        : 'text-deployText-secondary hover:text-white hover:bg-card/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-deployText-secondary'}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {user ? (
            <>
              {onOpenNewProject && (
                <button
                  onClick={onOpenNewProject}
                  className="flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-glow-primary transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </button>
              )}

              {/* Plan Badge */}
              <Link
                to="/billing"
                className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getPlanBadgeColor(
                  user.plan
                )} hover:opacity-90 transition-opacity`}
              >
                <Sparkles className="w-3 h-3 text-accent" />
                <span>{user.plan} PLAN</span>
              </Link>

              {/* User Dropdown / Profile */}
              <div className="flex items-center space-x-2 pl-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight">{user.name}</span>
                  <span className="text-[10px] text-deployText-secondary">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-deployText-secondary hover:text-error hover:bg-error/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm font-medium text-deployText-secondary hover:text-white px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg shadow-glow-primary transition-all"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
