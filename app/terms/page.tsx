import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen text-slate-100 p-8 md:p-16 flex flex-col items-center" style={{ background: "#090514", fontFamily: "'Geist', 'Inter', sans-serif" }}>
      <div className="max-w-3xl w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors mb-8 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>
        
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
            <p className="text-violet-300/60 mt-1">Effective Date: June 6, 2026</p>
          </div>
        </div>

        <div className="space-y-8 text-slate-300 leading-relaxed bg-[#0d0822] p-8 rounded-2xl border border-violet-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              1. Acceptance of Terms
            </h2>
            <p>By accessing the FleetCommand NYC Operations Dashboard, you agree to be bound by these Terms of Service. This platform is for authorized personnel only. Unauthorized access is strictly prohibited and may result in legal action.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              2. Authorized Use
            </h2>
            <p>The dashboard is provided for the purpose of managing and monitoring the NYC taxi fleet. You agree not to use the platform for any illegal or unauthorized purpose. You must not attempt to breach the security of the application or access data belonging to other users.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              3. Service Availability
            </h2>
            <p>While we strive for 99.99% uptime, FleetCommand NYC does not guarantee uninterrupted access to the platform. Maintenance windows will be communicated 48 hours in advance. We are not liable for any operational losses incurred during system downtime.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              4. Termination
            </h2>
            <p>We reserve the right to terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          </section>
        </div>
      </div>
    </div>
  );
}