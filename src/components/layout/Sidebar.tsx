'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  BookOpen,
  Users,
  Briefcase,
  Calculator,
  FileText,
  Settings,
  LogOut,
  X,
  Car,
  ChevronDown,
  ChevronRight,
  DollarSign,
  FileSpreadsheet,
  ClipboardList,
  Building2,
  Handshake,
  Wrench,
  Clock,
  Package,
  Wallet,
  PiggyBank,
  CreditCard,
  UserCircle,
  Target
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface NavSection {
  title: string;
  items: { name: string; href: string; icon: React.ElementType }[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Reports', href: '/reports', icon: FileText },
    ],
  },
  {
    title: 'Job Costing',
    items: [
      { name: 'Jobs', href: '/jobs', icon: Briefcase },
      { name: 'Estimates', href: '/estimates', icon: FileSpreadsheet },
      { name: 'Bid Packages', href: '/bid-packages', icon: Package },
      { name: 'Schedule of Values', href: '/sov', icon: ClipboardList },
      { name: 'Cost Codes', href: '/cost-codes', icon: Calculator },
      { name: 'Area Bid', href: '/area-bid', icon: Calculator },
    ],
  },
  {
    title: 'Team & Subs',
    items: [
      { name: 'Crew', href: '/crew', icon: Users },
      { name: 'Subcontractors', href: '/subcontractors', icon: Handshake },
      { name: 'Time Tracking', href: '/time-tracking', icon: Clock },
      { name: 'Tools', href: '/tools', icon: Wrench },
    ],
  },
  {
    title: 'CRM',
    items: [
      { name: 'Contacts', href: '/contacts', icon: UserCircle },
      { name: 'Companies', href: '/companies', icon: Building2 },
      { name: 'Deals', href: '/deals', icon: Target },
    ],
  },
  {
    title: 'Expenses',
    items: [
      { name: 'All Expenses', href: '/expenses', icon: Receipt },
      { name: 'Mileage', href: '/mileage', icon: Car },
      { name: 'Receipts', href: '/receipts', icon: CreditCard },
      { name: 'Budgets', href: '/budgets', icon: PiggyBank },
      { name: 'Recurring', href: '/recurring', icon: Wallet },
    ],
  },
  {
    title: 'Accounting',
    items: [
      { name: 'Invoices', href: '/invoices', icon: FileText },
      { name: 'Bills', href: '/bills', icon: Receipt },
      { name: 'Customers', href: '/customers', icon: Users },
      { name: 'Vendors', href: '/vendors', icon: Building2 },
      { name: 'Payments', href: '/payments', icon: DollarSign },
      { name: 'Journal', href: '/journal', icon: BookOpen },
      { name: 'Chart of Accounts', href: '/accounts', icon: FileSpreadsheet },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>(['Overview', 'Job Costing', 'Team & Subs', 'CRM', 'Expenses', 'Accounting']);

  const toggleSection = (title: string) => {
    setExpandedSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  const handleLogout = () => {
    if (onClose) onClose();
    logout();
  };

  return (
    <aside className="w-64 bg-slate-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="h-14 md:h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">ME</span>
          </div>
          <span className="text-white font-semibold text-sm">Made Easy Suite</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white md:hidden">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {navSections.map((section) => {
          const isExpanded = expandedSections.includes(section.title);
          const hasActiveItem = section.items.some(
            item => pathname === item.href || pathname.startsWith(item.href + '/')
          );

          return (
            <div key={section.title} className="mb-1">
              <button
                onClick={() => toggleSection(section.title)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
                  hasActiveItem ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>{section.title}</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={handleLinkClick}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 py-3 border-t border-slate-800 space-y-1">
        <Link
          href="/settings"
          onClick={handleLinkClick}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ${
            pathname === '/settings' ? 'bg-slate-800 text-white' : ''
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-600/20 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
