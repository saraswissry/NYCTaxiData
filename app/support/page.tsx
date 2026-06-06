import Link from 'next/link';
import { ArrowLeft, HeadphonesIcon, Mail, Phone, Clock } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen text-slate-100 p-8 md:p-16 flex flex-col items-center" style={{ background: "#090514", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div className="max-w-3xl w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <HeadphonesIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Ops Support</h1>
            <p className="text-violet-300/60 mt-1">We're here to help you manage the fleet.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#0d0822] p-6 rounded-2xl border border-violet-500/10 flex flex-col items-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 text-violet-400">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Emergency Dispatch</h3>
            <p className="text-sm text-slate-400 mb-4">For critical fleet issues and routing emergencies.</p>
            <p className="text-xl font-mono text-cyan-400">+1 (800) 555-0199</p>
          </div>

          <div className="bg-[#0d0822] p-6 rounded-2xl border border-violet-500/10 flex flex-col items-center text-center shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
            <div className="w-12 h-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4 text-violet-400">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">IT Support</h3>
            <p className="text-sm text-slate-400 mb-4">For account issues, API access, and bug reports.</p>
            <p className="text-lg font-mono text-violet-400">support@fleetcommand.nyc</p>
          </div>
        </div>

        <div className="bg-[#0d0822] p-8 rounded-2xl border border-violet-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-violet-400" />
            System Status
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
              <span className="text-slate-300">Telemetry Gateway</span>
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operational
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
              <span className="text-slate-300">Dispatch Engine</span>
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operational
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-black/20 rounded-xl border border-white/5">
              <span className="text-slate-300">Analytics Service</span>
              <span className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Operational
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}