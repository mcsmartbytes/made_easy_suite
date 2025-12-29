import Link from 'next/link';
import { ArrowRight, Briefcase, Receipt, BookOpen, Users, Calculator, BarChart3, Shield, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">ME</span>
            </div>
            <span className="text-white text-xl font-semibold">Made Easy Suite</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
              Login
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
          <Zap className="w-4 h-4 text-blue-400" />
          <span className="text-blue-400 text-sm font-medium">The QuoteIQ Alternative Built for Contractors</span>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Everything Your Business Needs,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
            Made Easy
          </span>
        </h1>

        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
          Jobs, CRM, Expenses, Invoicing, Estimates, and Real-Time Profit Tracking —
          all in one powerful platform designed for contractors and service businesses.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors flex items-center gap-2"
          >
            Start Free Trial <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="#features"
            className="border border-slate-600 hover:border-slate-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors"
          >
            See Features
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-4">All Your Business Tools in One Place</h2>
        <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
          Stop juggling multiple apps. Made Easy Suite brings everything together.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Briefcase, title: 'Job Management', desc: 'Track jobs from estimate to completion with real-time profit visibility.' },
            { icon: Users, title: 'CRM & Pipeline', desc: 'Manage leads, customers, and deals. Never lose a follow-up again.' },
            { icon: Receipt, title: 'Expense Tracking', desc: 'Snap receipts, track mileage, auto-categorize. IRS Schedule C ready.' },
            { icon: BookOpen, title: 'Invoicing & Payments', desc: 'Professional invoices, online payments, job-linked billing.' },
            { icon: Calculator, title: 'Area Bid Calculator', desc: 'Quick measurements and pricing for any job size.' },
            { icon: BarChart3, title: 'Live Profit Tracking', desc: 'Know your margins in real-time, not months later.' },
          ].map((feature, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-slate-600 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Differentiator */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-10 md:p-16 text-center">
          <Shield className="w-16 h-16 text-white/80 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Unlike the Competition, We Show You Profit — Not Just Revenue
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8">
            Most job management tools tell you what you billed. Made Easy Suite shows you what you actually made,
            with live job costing that updates as expenses come in.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-slate-100 transition-colors"
          >
            See It In Action <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Ready to Run Your Business the Easy Way?</h2>
        <p className="text-slate-400 mb-8 max-w-xl mx-auto">
          Join contractors who switched from spreadsheets and outdated software to Made Easy Suite.
        </p>
        <Link
          href="/register"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors inline-flex items-center gap-2"
        >
          Start Your Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-10 border-t border-slate-800">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ME</span>
            </div>
            <span className="text-slate-400">Made Easy Suite by MC Smart Bytes</span>
          </div>
          <p className="text-slate-500 text-sm">© 2024 MC Smart Bytes. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
