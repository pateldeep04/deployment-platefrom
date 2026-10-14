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
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DEVELOPER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link to={user ? "/dashboard" : "/"} className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
                Deploy<span className="text-blue-600">Hub</span>
              </span>
              <span className="hidden sm:block text-[10px] text-slate-500 tracking-widest uppercase font-medium -mt-1">
                Deploy. Host. Scale.
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
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
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
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
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>{user.plan} PLAN</span>
              </Link>

              {/* User Dropdown / Profile */}
              <div className="flex items-center space-x-2 pl-2">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</span>
                  <span className="text-[10px] text-slate-500">{user.email}</span>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-all"
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
