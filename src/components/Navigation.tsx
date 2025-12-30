'use client';

import Link from 'next/link';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIndustry } from '@/contexts/IndustryContext';

// Quick Utilities Component
function QuickUtilities({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeUtil, setActiveUtil] = useState<'calc' | 'calendar' | 'converter' | 'timer' | null>(null);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcNewNum, setCalcNewNum] = useState(true);

  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Converter state
  const [convertValue, setConvertValue] = useState('');
  const [convertType, setConvertType] = useState<'length' | 'area' | 'weight'>('length');
  const [convertFrom, setConvertFrom] = useState('ft');
  const [convertTo, setConvertTo] = useState('m');

  // Stable timer callback
  const tick = useCallback(() => {
    setTimerSeconds(s => s + 1);
  }, []);

  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(tick, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, tick]);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Calculator functions
  const handleCalcNum = (num: string) => {
    if (calcNewNum) {
      setCalcDisplay(num);
      setCalcNewNum(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? num : calcDisplay + num);
    }
  };

  const handleCalcOp = (op: string) => {
    setCalcPrev(parseFloat(calcDisplay));
    setCalcOp(op);
    setCalcNewNum(true);
  };

  const handleCalcEquals = () => {
    if (calcPrev === null || !calcOp) return;
    const curr = parseFloat(calcDisplay);
    let result = 0;
    switch (calcOp) {
      case '+': result = calcPrev + curr; break;
      case '-': result = calcPrev - curr; break;
      case '×': result = calcPrev * curr; break;
      case '÷': result = curr !== 0 ? calcPrev / curr : 0; break;
    }
    setCalcDisplay(String(parseFloat(result.toFixed(8))));
    setCalcPrev(null);
    setCalcOp(null);
    setCalcNewNum(true);
  };

  const handleCalcClear = () => {
    setCalcDisplay('0');
    setCalcPrev(null);
    setCalcOp(null);
    setCalcNewNum(true);
  };

  // Unit converter
  const conversionRates: Record<string, Record<string, number>> = {
    length: { ft: 1, m: 0.3048, in: 12, cm: 30.48, yd: 0.333333 },
    area: { sqft: 1, sqm: 0.092903, sqyd: 0.111111, acre: 0.0000229568 },
    weight: { lb: 1, kg: 0.453592, oz: 16, ton: 0.0005 },
  };

  const getConvertedValue = () => {
    if (!convertValue) return '';
    const num = parseFloat(convertValue);
    if (isNaN(num)) return '';
    const rates = conversionRates[convertType];
    const inBase = num / rates[convertFrom];
    const result = inBase * rates[convertTo];
    return result.toFixed(4);
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl z-50 overflow-hidden">
      {/* Utility tabs */}
      <div className="flex border-b bg-gray-50">
        {[
          { id: 'calc', icon: '🔢', label: 'Calc' },
          { id: 'calendar', icon: '📅', label: 'Cal' },
          { id: 'converter', icon: '📏', label: 'Conv' },
          { id: 'timer', icon: '⏱️', label: 'Timer' },
        ].map(util => (
          <button
            key={util.id}
            onClick={() => setActiveUtil(activeUtil === util.id ? null : util.id as any)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              activeUtil === util.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="block">{util.icon}</span>
            {util.label}
          </button>
        ))}
      </div>

      {/* Calculator */}
      {activeUtil === 'calc' && (
        <div className="p-3">
          <div className="bg-gray-900 text-white text-right p-3 rounded-lg mb-2 text-xl font-mono">
            {calcDisplay}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {['C','±','%','÷','7','8','9','×','4','5','6','-','1','2','3','+','0','.','='].map((btn, idx) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') handleCalcClear();
                  else if (btn === '=') handleCalcEquals();
                  else if (['+','-','×','÷'].includes(btn)) handleCalcOp(btn);
                  else if (btn === '±') setCalcDisplay(d => String(-parseFloat(d)));
                  else if (btn === '%') setCalcDisplay(d => String(parseFloat(d) / 100));
                  else if (btn === '.') {
                    if (!calcDisplay.includes('.')) setCalcDisplay(d => d + '.');
                  }
                  else handleCalcNum(btn);
                }}
                className={`${btn === '0' ? 'col-span-2' : ''} p-2 text-sm font-medium rounded ${
                  ['+','-','×','÷'].includes(btn) ? 'bg-blue-500 text-white hover:bg-blue-600' :
                  btn === 'C' ? 'bg-red-500 text-white hover:bg-red-600' :
                  btn === '=' ? 'bg-green-500 text-white hover:bg-green-600' :
                  ['±','%'].includes(btn) ? 'bg-gray-300 hover:bg-gray-400 text-gray-800' :
                  'bg-gray-100 hover:bg-gray-200 text-gray-800'
                }`}
              >
                {btn}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      {activeUtil === 'calendar' && (
        <div className="p-3">
          <div className="text-center mb-2">
            <p className="text-lg font-semibold text-gray-900">
              {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {new Date().getDate()}
            </p>
            <p className="text-sm text-gray-600">
              {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-center">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="font-medium text-gray-500 py-1">{d}</div>
            ))}
            {(() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
              const days = [];
              for (let i = 0; i < firstDay.getDay(); i++) {
                days.push(<div key={`empty-${i}`} className="py-1" />);
              }
              for (let d = 1; d <= lastDay.getDate(); d++) {
                const isToday = d === today.getDate();
                days.push(
                  <div
                    key={d}
                    className={`py-1 rounded ${isToday ? 'bg-blue-600 text-white font-bold' : 'text-gray-700'}`}
                  >
                    {d}
                  </div>
                );
              }
              return days;
            })()}
          </div>
        </div>
      )}

      {/* Unit Converter */}
      {activeUtil === 'converter' && (
        <div className="p-3 space-y-3">
          <select
            value={convertType}
            onChange={(e) => {
              setConvertType(e.target.value as any);
              const units = Object.keys(conversionRates[e.target.value]);
              setConvertFrom(units[0]);
              setConvertTo(units[1]);
            }}
            className="w-full px-2 py-1 border rounded text-sm"
          >
            <option value="length">Length</option>
            <option value="area">Area</option>
            <option value="weight">Weight</option>
          </select>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={convertValue}
              onChange={(e) => setConvertValue(e.target.value)}
              placeholder="Value"
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <select
              value={convertFrom}
              onChange={(e) => setConvertFrom(e.target.value)}
              className="px-2 py-1 border rounded text-sm"
            >
              {Object.keys(conversionRates[convertType]).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="text-center text-gray-400">↓</div>
          <div className="flex gap-2 items-center">
            <div className="flex-1 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
              {getConvertedValue() || '—'}
            </div>
            <select
              value={convertTo}
              onChange={(e) => setConvertTo(e.target.value)}
              className="px-2 py-1 border rounded text-sm"
            >
              {Object.keys(conversionRates[convertType]).map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Stopwatch/Timer */}
      {activeUtil === 'timer' && (
        <div className="p-3 text-center">
          <div className="text-4xl font-mono font-bold text-gray-900 mb-4">
            {formatTime(timerSeconds)}
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setTimerRunning(!timerRunning)}
              className={`px-4 py-2 rounded-lg font-medium ${
                timerRunning
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {timerRunning ? 'Stop' : 'Start'}
            </button>
            <button
              onClick={() => { setTimerSeconds(0); setTimerRunning(false); }}
              className="px-4 py-2 bg-gray-200 rounded-lg font-medium hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Default - show all options */}
      {!activeUtil && (
        <div className="p-3 text-center text-sm text-gray-500">
          Select a utility above
        </div>
      )}
    </div>
  );
}

type Variant = 'expenses' | 'sitesense';

type DropdownItem = {
  href: string;
  label: string;
  description?: string;
};

function NavDropdown({
  label,
  items,
  isOpen,
  onToggle,
  onClose
}: {
  label: string;
  items: DropdownItem[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 text-slate-200 hover:text-blue-400 transition-colors"
      >
        {label}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="block px-4 py-2 hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
              {item.description && (
                <span className="block text-xs text-gray-500">{item.description}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navigation({ variant = 'sitesense' }: { variant?: Variant }) {
  const { user, logout } = useAuth();
  const { isModuleEnabled, getTerminology } = useIndustry();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);
  const isExpense = variant === 'expenses';

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = () => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName) {
      const names = fullName.split(' ');
      return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const handleDropdownToggle = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeAllDropdowns = () => {
    setOpenDropdown(null);
  };

  // Map menu items to their required modules
  const allWorkItems: (DropdownItem & { module?: string })[] = [
    { href: '/jobs', label: getTerminology('job', 'Jobs'), description: 'Manage projects & clients', module: 'jobs' },
    { href: '/estimates', label: 'Estimates', description: 'Create & send bids', module: 'estimates' },
    { href: '/sov', label: 'Schedule of Values', description: 'SOV & billing items', module: 'sov' },
    { href: '/bid-packages', label: 'Bid Packages', description: 'Manage trade scopes', module: 'bid_packages' },
    { href: '/subcontractors', label: 'Subcontractors', description: 'Sub compliance & bids', module: 'subcontractors' },
    { href: '/cost-codes', label: 'Cost Codes', description: 'CSI MasterFormat codes', module: 'cost_codes' },
    { href: '/properties', label: 'Properties', description: 'Units, tenants, leases', module: 'units' },
    { href: '/properties/work-orders', label: 'Work Orders', description: 'Maintenance requests', module: 'work_orders' },
    { href: '/time-tracking', label: 'Time Tracking', description: 'Log hours worked' },
    { href: '/crew', label: 'Team & Crew', description: 'Manage workers & schedules', module: 'crews' },
  ];

  // Filter work items based on enabled modules
  const workItems = useMemo(() => {
    return allWorkItems.filter(item => !item.module || isModuleEnabled(item.module));
  }, [isModuleEnabled, getTerminology]);

  const financialItems: DropdownItem[] = [
    { href: '/expenses', label: 'Expenses', description: 'Track all expenses' },
    { href: '/receipts', label: 'Receipts', description: 'Receipt gallery & OCR' },
    { href: '/mileage', label: 'Mileage', description: 'Track business trips' },
    { href: '/budgets', label: 'Budgets', description: 'Set spending limits' },
    { href: '/recurring', label: 'Recurring', description: 'Recurring expenses' },
  ];

  return (
    <nav className="bg-gradient-to-r from-slate-900 to-slate-800 text-slate-100 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-slate-700 flex items-center justify-center text-slate-50 text-sm font-bold border border-slate-600">
            {isExpense ? 'EM' : 'SS'}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">
              {isExpense ? 'Expenses Made Easy' : 'SiteSense'}
            </span>
            <span className="text-[11px] text-slate-300">
              {isExpense ? 'Expenses · Budgets · Receipts' : 'Jobs · Time · Costs'}
            </span>
          </div>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 text-slate-200 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {showMobileMenu ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Main nav - Desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {isExpense ? (
            <>
              <Link href="/expense-dashboard" className="text-slate-200 hover:text-blue-400 transition-colors">
                Dashboard
              </Link>
              <Link href="/recurring" className="text-slate-200 hover:text-blue-400 transition-colors">
                Recurring
              </Link>
              <Link href="/budgets" className="text-slate-200 hover:text-blue-400 transition-colors">
                Budgets
              </Link>
              <Link href="/receipts" className="text-slate-200 hover:text-blue-400 transition-colors">
                Receipts
              </Link>
              <Link href="/mileage" className="text-slate-200 hover:text-blue-400 transition-colors">
                Mileage
              </Link>
              <Link href="/reports" className="text-slate-200 hover:text-blue-400 transition-colors">
                Reports
              </Link>
              <Link href="/settings" className="text-slate-200 hover:text-blue-400 transition-colors">
                Settings
              </Link>
            </>
          ) : (
            <>
              <Link href="/" className="text-slate-200 hover:text-blue-400 transition-colors">
                Dashboard
              </Link>

              <NavDropdown
                label="Work"
                items={workItems}
                isOpen={openDropdown === 'work'}
                onToggle={() => handleDropdownToggle('work')}
                onClose={closeAllDropdowns}
              />

              <Link href="/contacts" className="text-slate-200 hover:text-blue-400 transition-colors">
                Contacts
              </Link>

              <Link href="/todos" className="text-slate-200 hover:text-blue-400 transition-colors">
                Tasks
              </Link>

              <Link href="/tools" className="text-slate-200 hover:text-blue-400 transition-colors">
                Tools
              </Link>

              <NavDropdown
                label="Financial"
                items={financialItems}
                isOpen={openDropdown === 'financial'}
                onToggle={() => handleDropdownToggle('financial')}
                onClose={closeAllDropdowns}
              />

              <Link href="/reports" className="text-slate-200 hover:text-blue-400 transition-colors">
                Reports
              </Link>
            </>
          )}
        </div>

        {/* Right side: utilities + user menu */}
        <div className="relative hidden md:flex items-center gap-3">
          {/* Quick Utilities Button */}
          {!isExpense && (
            <div className="relative">
              <button
                onClick={() => setShowUtilities(!showUtilities)}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                title="Quick Utilities"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </button>
              <QuickUtilities isOpen={showUtilities} onClose={() => setShowUtilities(false)} />
            </div>
          )}

          {user ? (
            <>
              <span className="hidden sm:inline text-[11px] text-slate-300">
                {user.user_metadata?.company_name || user.user_metadata?.full_name || user.email}
              </span>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="h-8 w-8 rounded-full bg-slate-700/60 border border-slate-600 flex items-center justify-center text-[10px] font-semibold text-slate-200 hover:bg-slate-600 transition-colors"
              >
                {getInitials()}
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      handleLogout();
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700">
          <div className="px-4 py-3 space-y-1">
            {isExpense ? (
              <>
                <Link href="/expense-dashboard" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Dashboard</Link>
                <Link href="/recurring" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Recurring</Link>
                <Link href="/budgets" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Budgets</Link>
                <Link href="/receipts" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Receipts</Link>
                <Link href="/mileage" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Mileage</Link>
                <Link href="/reports" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Reports</Link>
                <Link href="/settings" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Settings</Link>
              </>
            ) : (
              <>
                <Link href="/" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Dashboard</Link>

                {/* Work section - filtered by enabled modules */}
                <div className="py-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Work</p>
                  {workItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block py-1.5 pl-3 text-slate-200 hover:text-white"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <Link href="/contacts" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Contacts</Link>
                <Link href="/todos" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Tasks</Link>
                <Link href="/tools" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Tools</Link>

                {/* Financial section */}
                <div className="py-2">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Financial</p>
                  <Link href="/mileage" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Mileage</Link>
                  <Link href="/budgets" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Budgets</Link>
                  <Link href="/recurring" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Recurring</Link>
                  <Link href="/receipts" className="block py-1.5 pl-3 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Receipts</Link>
                </div>

                <Link href="/reports" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Reports</Link>
                <Link href="/settings" className="block py-2 text-slate-200 hover:text-white" onClick={() => setShowMobileMenu(false)}>Settings</Link>
              </>
            )}

            {/* User section in mobile */}
            {user && (
              <div className="pt-3 mt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400">{user.email}</p>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className="block w-full text-left py-2 text-red-400 hover:text-red-300"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
