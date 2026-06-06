import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen text-slate-100 p-8 md:p-16 flex flex-col items-center" style={{ background: "#090514", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div className="max-w-3xl w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
            <p className="text-violet-300/60 mt-1">Last updated: June 6, 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed bg-[#0d0822] p-8 rounded-2xl border border-violet-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              1. Data Collection
            </h2>
            <p>FleetCommand NYC collects telematics, location, and operational data from all active fleet vehicles. This includes real-time GPS coordinates, speed, heading, and driver status. We also collect passenger pickup/drop-off locations to optimize routing and dispatch operations.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              2. Usage of Information
            </h2>
            <p>The data collected is used exclusively for fleet management, surge prediction, and dispatch optimization. Our AI models process historical data to predict demand gaps and recommend repositioning strategies. Personal driver information is kept strictly confidential and is only accessible by authorized dispatch personnel.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              3. Data Security
            </h2>
            <p>All data is encrypted at rest and in transit using TLS 1.3 and AES-256 standards. Access to the FleetCommand dashboard requires multi-factor authentication and is restricted to whitelisted IP addresses. We are fully compliant with SOC 2 Type II and GDPR regulations.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              4. Third-Party Sharing
            </h2>
            <p>We do not sell your data. We may share anonymized, aggregated traffic data with city planning authorities (e.g., NYC DOT) to improve urban mobility and reduce congestion. No personally identifiable information is ever shared with third parties.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
