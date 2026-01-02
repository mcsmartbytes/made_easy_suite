'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileSpreadsheet,
  Calculator,
  Users,
  Building2,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Presentation,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

interface NavDropdown {
  label: string;
  items: NavItem[];
}

// Full navigation
const fullNavItems: (NavItem | NavDropdown)[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Area Bid', href: '/area-bid', icon: Calculator },
  {
    label: 'Jobs',
    items: [
      { name: 'All Jobs', href: '/jobs', icon: Briefcase },
      { name: 'Estimates', href: '/estimates', icon: FileSpreadsheet },
      { name: 'Scheduling', href: '/scheduling', icon: CalendarDays },
    ],
  },
  {
    label: 'CRM',
    items: [
      { name: 'Contacts', href: '/contacts', icon: Users },
      { name: 'Companies', href: '/companies', icon: Building2 },
    ],
  },
  { name: 'Invoices', href: '/invoices', icon: FileText },
];

// Streamlined navigation for demo mode
const demoNavItems: (NavItem | NavDropdown)[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Area Bid', href: '/area-bid', icon: Calculator },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Estimates', href: '/estimates', icon: FileSpreadsheet },
  { name: 'Invoices', href: '/invoices', icon: FileText },
];

function isDropdown(item: NavItem | NavDropdown): item is NavDropdown {
  return 'items' in item;
}

export default function TopNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDemoMode = localStorage.getItem('presentationMode') === 'true';
    setDemoMode(isDemoMode);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDemoMode = () => {
    const newMode = !demoMode;
    setDemoMode(newMode);
    localStorage.setItem('presentationMode', newMode.toString());
  };

  const navItems = demoMode ? demoNavItems : fullNavItems;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <nav className="bg-slate-900 text-white">
      <div className="px-4 md:px-6">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">ME</span>
              </div>
              <span className="text-white font-semibold text-sm hidden sm:inline">Made Easy Suite</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1" ref={dropdownRef}>
              {navItems.map((item, idx) =>
                isDropdown(item) ? (
                  <div key={item.label} className="relative">
                    <button
                      onClick={() => setOpenDropdown(openDropdown === item.label ? null : item.label)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition ${
                        item.items.some(i => isActive(i.href))
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                      <ChevronDown className={`w-4 h-4 transition ${openDropdown === item.label ? 'rotate-180' : ''}`} />
                    </button>
                    {openDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-1 bg-slate-800 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                        {item.items.map((subItem) => (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`flex items-center gap-2 px-4 py-2 text-sm transition ${
                              isActive(subItem.href)
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            }`}
                          >
                            <subItem.icon className="w-4 h-4" />
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Demo mode toggle */}
            <button
              onClick={toggleDemoMode}
              className={`hidden md:flex items-center gap-1 px-3 py-1.5 rounded text-sm transition ${
                demoMode
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title={demoMode ? 'Exit Demo Mode' : 'Enter Demo Mode'}
            >
              <Presentation className="w-4 h-4" />
              {demoMode ? 'Demo ON' : 'Demo'}
            </button>

            {/* Settings */}
            <Link
              href="/settings"
              className={`p-2 rounded-lg transition ${
                isActive('/settings')
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
            </Link>

            {/* Logout */}
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:bg-red-600/20 hover:text-red-400 rounded-lg transition"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800">
            <div className="flex flex-col gap-1">
              {navItems.map((item) =>
                isDropdown(item) ? (
                  <div key={item.label}>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                      {item.label}
                    </div>
                    {item.items.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition ${
                          isActive(subItem.href)
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <subItem.icon className="w-4 h-4" />
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                      isActive(item.href)
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                )
              )}
              <button
                onClick={() => {
                  toggleDemoMode();
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition mt-2 ${
                  demoMode
                    ? 'bg-amber-600/20 text-amber-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Presentation className="w-4 h-4" />
                {demoMode ? 'Demo Mode ON' : 'Presentation Mode'}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
