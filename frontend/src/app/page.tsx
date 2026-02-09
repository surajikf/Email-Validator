import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-xl text-slate-800">EmailValidator</span>
        </div>
        <nav>
          <Link href="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-sm font-medium mb-6 inline-flex items-center gap-2">
          <Zap className="w-4 h-4" /> Fast & Secure Bulk Validation
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6">
          Verify Email Lists <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            With Confidence
          </span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed">
          Upload your email list and clean it instantly with our <strong>100% free</strong> bulk email verifier tool.
          Remove invalid, disposable, temporary, or role-based emails in seconds.
          Boost your email deliverability without any limits or signups.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/validate">
            <Button size="lg" className="h-14 px-8 text-lg shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all">
              Start Validating Now <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full text-left">
          {[
            { title: "99.9% Accuracy", desc: "Multi-layer checks including Syntax, DNS, MX, and SMTP verification." },
            { title: "Bulk Processing", desc: "Upload CSV or Excel files with thousands of emails securely." },
            { title: "Real-time Results", desc: "Watch the validation process live with instant downloadable reports." }
          ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-indigo-100 transition-colors">
              <CheckCircle className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-slate-500 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-24 max-w-3xl text-left bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What is a Bulk Email Verifier?</h2>
          <p className="text-slate-600 leading-relaxed">
            A bulk email verifier scans your entire email list and filters out fake, invalid, temporary, or risky emails.
            It helps you reduce bounce rates, improve sender reputation, and reach more real people when sending newsletters or campaigns.
          </p>
        </div>
      </section>

      <footer className="py-8 text-center text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} EmailValidator. Built for performance.
      </footer>
    </main>
  );
}
