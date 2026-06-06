"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { fleetApi } from "@/lib/fleet-api";
import { setSession, type AuthUser } from "@/lib/auth";
import dynamic from "next/dynamic";
import Link from "next/link";
import countriesData from "@/lib/constant/countries.json";

const Cyber3DScene = dynamic(
  () => import("@/components/login/cyber-3d-scene").then((m) => m.Cyber3DScene),
  { ssr: false }
);

const FleetLoader = dynamic(
  () => import("@/components/login/fleet-loader").then((m) => m.FleetLoader),
  { ssr: false }
);

// ── Types ────────────────────────────────────────────────────────────────────

interface Country {
  code: string;
  name_en: string;
  name_ar: string;
  dial_code: string;
  flag: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Render a flag as an <img> via flagcdn.com so it works on Windows too. */
function FlagImg({ code, size = 20 }: { code: string; size?: number }) {
  const src = `https://flagcdn.com/w${size * 2}/${code.toLowerCase()}.png`;
  return (
    <img
      src={src}
      alt={code}
      width={size}
      height={Math.round(size * 0.75)}
      loading="lazy"
      className="inline-block rounded-[2px] object-cover"
      style={{ width: size, height: Math.round(size * 0.75) }}
      onError={(e) => {
        // Fallback to emoji if image fails
        const el = e.currentTarget;
        const country = (countriesData as Country[]).find(
          (c) => c.code.toLowerCase() === code.toLowerCase()
        );
        if (country) {
          const span = document.createElement("span");
          span.textContent = country.flag;
          span.style.fontSize = `${size - 4}px`;
          el.replaceWith(span);
        }
      }}
    />
  );
}

/** Extract the pure dial code digits (e.g. "+1-264" → "+1264", "+1-809 and 1-829" → "+1809") */
function cleanDialCode(raw: string): string {
  // Take only the first code if there are multiple (e.g. "+1-809 and 1-829")
  const first = raw.split(" and ")[0].split(",")[0].trim();
  // Remove dashes
  return first.replace(/-/g, "");
}

// ── Stats ticker data ────────────────────────────────────────────────────────

const STATS = [
  { label: "Active Taxis", value: "2,847", delta: "+12" },
  { label: "Avg Response", value: "3.2 min", delta: "-0.4" },
  { label: "Live Zones", value: "94", delta: "+3" },
  { label: "Revenue Today", value: "$1.24M", delta: "+8.2%" },
];

// ── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const countries = countriesData as Country[];

  // Default to US (+1)
  const defaultCountry =
    countries.find((c) => c.code === "US") || countries[0];

  const [booting, setBooting] = useState(true);
  const [selectedCountry, setSelectedCountry] =
    useState<Country>(defaultCountry);
  const [localPhone, setLocalPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [statIdx, setStatIdx] = useState(0);

  // Country picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleBootComplete = useCallback(() => setBooting(false), []);

  // cycle stats ticker
  useEffect(() => {
    const t = setInterval(
      () => setStatIdx((i) => (i + 1) % STATS.length),
      2800
    );
    return () => clearInterval(t);
  }, []);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus search when picker opens
  useEffect(() => {
    if (pickerOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [pickerOpen]);

  // Filter countries by search query
  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase().trim();
    return countries.filter(
      (c) =>
        c.name_en.toLowerCase().includes(q) ||
        c.name_ar.includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dial_code.includes(q)
    );
  }, [search, countries]);

  // ── Login handler ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError(null);

    const dialCode = cleanDialCode(selectedCountry.dial_code);
    const phone = localPhone.startsWith("0")
      ? localPhone.slice(1)
      : localPhone;
    const fullPhone = `${dialCode}${phone}`;

    try {
      const response = await fleetApi.auth.login({
        phoneNumber: fullPhone,
        password,
      });

      // Parse the exact response format:
      // { data: { token, role, fullName, id, isSuccess, message }, isSuccess, ... }
      const data = response?.data ?? response;
      const token: string | undefined = data?.token;

      if (!token) {
        throw new Error(
          data?.message || response?.message || "No token received from server"
        );
      }

      // Check server-side success flag
      if (data?.isSuccess === false || response?.isSuccess === false) {
        throw new Error(
          data?.message || response?.message || "Login failed"
        );
      }

      // Build user profile
      const nameParts = (data?.fullName || "").split(" ");
      const user: AuthUser = {
        phoneNumber: fullPhone,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        role: data?.role || "User",
        driverId: data?.id,
      };

      setSession(token, user);
      sessionStorage.setItem("hasLoadedDashboard", "true");
      window.location.href = "/";
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      // Strip the [FleetAPI] prefix for cleaner display
      setLoginError(
        message.replace(/^\[FleetAPI\]\s*\d+\s*\S+\s*[—-]\s*/, "")
      );
    } finally {
      setIsLoading(false);
    }
  };

  const s = STATS[statIdx];

  return (
    <div
      className="flex min-h-screen overflow-hidden text-slate-100"
      style={{
        background: "#090514",
        fontFamily: "'Geist', 'Inter', sans-serif",
      }}
    >
      {booting && <FleetLoader onComplete={handleBootComplete} />}
      {/* ══ LEFT: Login Form ══ */}
      <div
        className="relative z-10 flex flex-col justify-between w-full md:w-[480px] shrink-0 px-10 xl:px-14 py-10"
        style={{
          background: "linear-gradient(160deg, #0d0822 0%, #0a0618 100%)",
          borderRight: "1px solid rgba(139,92,246,0.12)",
          boxShadow: "6px 0 40px rgba(0,0,0,0.6)",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent, #8b5cf6 30%, #06b6d4 70%, transparent)",
          }}
        />

        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 0 20px rgba(124,58,237,0.5)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="11" width="20" height="8" rx="2" />
                <path d="M5 11V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
                <path d="M7 7l1.5-3h7L17 7" />
                <circle cx="7" cy="19" r="1.5" fill="currentColor" />
                <circle cx="17" cy="19" r="1.5" fill="currentColor" />
                <path d="M10 8h4" />
              </svg>
            </div>
            <div>
              <div className="text-base font-bold tracking-widest text-violet-300 uppercase">
                FleetCommand
              </div>
              <div className="text-[10px] tracking-[0.2em] text-violet-500 uppercase">
                NYC Operations
              </div>
            </div>
          </div>
        </header>

        {/* Main Form */}
        <main className="flex-1 flex flex-col justify-center py-8">
          {/* Title */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-[2px] rounded-full bg-violet-500" />
              <span className="text-[10px] tracking-[0.25em] text-violet-400 uppercase">
                Secure Access
              </span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
              Command
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(90deg, #8b5cf6, #a78bfa, #06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Center Login
              </span>
            </h1>
            <p className="mt-2 text-sm text-violet-300/50">
              Real-time fleet intelligence. Sign in to your ops dashboard.
            </p>
          </div>

          {/* Live Ticker */}
          <div
            className="flex items-center gap-3 mb-6 px-4 py-2.5 rounded-xl"
            style={{
              background: "rgba(124,58,237,0.07)",
              border: "1px solid rgba(124,58,237,0.18)",
            }}
          >
            <span
              className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"
              style={{ boxShadow: "0 0 8px #22d3ee" }}
            />
            <div
              key={statIdx}
              className="text-xs text-violet-300/70 flex-1"
              style={{ animation: "fadeUp 0.35s ease" }}
            >
              <span className="text-violet-300 font-semibold">{s.label}:</span>{" "}
              <span className="text-white font-bold">{s.value}</span>{" "}
              <span
                className={
                  s.delta.startsWith("+") ? "text-emerald-400" : "text-red-400"
                }
              >
                {s.delta}
              </span>
            </div>
            <div className="flex gap-1">
              {STATS.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === statIdx ? 14 : 5,
                    height: 5,
                    background:
                      i === statIdx
                        ? "#8b5cf6"
                        : "rgba(139,92,246,0.2)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Phone Number with Country Code Picker */}
            <div>
              <label className="block text-[11px] font-semibold text-violet-300/60 uppercase tracking-widest mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                {/* ── Country Code Dropdown ── */}
                <div className="relative" ref={pickerRef}>
                  <button
                    type="button"
                    id="country-code-btn"
                    onClick={() => {
                      setPickerOpen((v) => !v);
                      setSearch("");
                    }}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-xl text-sm text-white transition-all duration-200 whitespace-nowrap h-full"
                    style={{
                      background: "rgba(6,3,13,0.8)",
                      border: pickerOpen
                        ? "1px solid rgba(139,92,246,0.6)"
                        : "1px solid rgba(139,92,246,0.2)",
                      boxShadow: pickerOpen
                        ? "0 0 0 3px rgba(139,92,246,0.1)"
                        : "none",
                      minWidth: 100,
                    }}
                  >
                    <FlagImg code={selectedCountry.code} size={18} />
                    <span className="text-violet-300 font-mono text-xs">
                      {cleanDialCode(selectedCountry.dial_code)}
                    </span>
                    <svg
                      viewBox="0 0 10 6"
                      className={`w-2.5 h-2.5 text-violet-500 transition-transform duration-200 ${pickerOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M1 1l4 4 4-4" />
                    </svg>
                  </button>

                  {/* ── Dropdown Panel ── */}
                  {pickerOpen && (
                    <div
                      className="absolute z-50 left-0 top-[calc(100%+4px)] rounded-xl overflow-hidden"
                      style={{
                        background: "rgba(13,8,34,0.98)",
                        border: "1px solid rgba(139,92,246,0.25)",
                        boxShadow:
                          "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1)",
                        backdropFilter: "blur(20px)",
                        width: 320,
                        maxHeight: 340,
                      }}
                    >
                      {/* Search */}
                      <div className="p-2 border-b border-violet-500/10">
                        <div className="relative">
                          <svg
                            viewBox="0 0 20 20"
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="8.5" cy="8.5" r="6" />
                            <path d="M13 13l4.5 4.5" />
                          </svg>
                          <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search country or code..."
                            className="w-full pl-9 pr-3 py-2 rounded-lg text-xs text-white placeholder-violet-700 outline-none"
                            style={{
                              background: "rgba(0,0,0,0.4)",
                              border: "1px solid rgba(139,92,246,0.15)",
                            }}
                            onFocus={(e) => {
                              e.target.style.border =
                                "1px solid rgba(139,92,246,0.4)";
                            }}
                            onBlur={(e) => {
                              e.target.style.border =
                                "1px solid rgba(139,92,246,0.15)";
                            }}
                          />
                        </div>
                      </div>

                      {/* List */}
                      <div
                        ref={listRef}
                        className="overflow-y-auto"
                        style={{ maxHeight: 280 }}
                      >
                        {filtered.length === 0 ? (
                          <div className="text-center py-6 text-xs text-violet-600">
                            No countries found
                          </div>
                        ) : (
                          filtered.map((c) => {
                            const isSelected =
                              c.code === selectedCountry.code;
                            return (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setPickerOpen(false);
                                  setSearch("");
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-violet-500/10"
                                style={{
                                  background: isSelected
                                    ? "rgba(139,92,246,0.12)"
                                    : "transparent",
                                }}
                              >
                                <FlagImg code={c.code} size={20} />
                                <span className="text-xs text-white flex-1 truncate">
                                  {c.name_en}
                                </span>
                                <span className="text-[11px] font-mono text-violet-400 shrink-0">
                                  {cleanDialCode(c.dial_code)}
                                </span>
                                {isSelected && (
                                  <svg
                                    viewBox="0 0 12 12"
                                    className="w-3 h-3 text-violet-400 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                  >
                                    <polyline points="1.5 6 4.5 9 10.5 3" />
                                  </svg>
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Phone Number Input ── */}
                <input
                  id="login-phone"
                  type="tel"
                  required
                  value={localPhone}
                  onChange={(e) =>
                    setLocalPhone(e.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="2125559876"
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-violet-900 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(6,3,13,0.8)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(139,92,246,0.6)";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(139,92,246,0.2)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-violet-300/60 uppercase tracking-widest">
                  Password
                </label>
                <button
                  type="button"
                  id="forgot-password"
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 pr-11 py-3 rounded-xl text-sm text-white placeholder-violet-900 outline-none transition-all duration-200"
                  style={{
                    background: "rgba(6,3,13,0.8)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                  onFocus={(e) => {
                    e.target.style.border = "1px solid rgba(139,92,246,0.6)";
                    e.target.style.boxShadow =
                      "0 0 0 3px rgba(139,92,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.border = "1px solid rgba(139,92,246,0.2)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  id="toggle-pw"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-violet-600 hover:text-violet-400 transition-colors text-xs select-none"
                >
                  {showPw ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {/* Remember */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="remember-toggle"
                onClick={() => setRemember((v) => !v)}
                className="w-4 h-4 rounded flex items-center justify-center transition-all shrink-0"
                style={{
                  background: remember
                    ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                    : "rgba(255,255,255,0.04)",
                  border: remember
                    ? "none"
                    : "1px solid rgba(139,92,246,0.3)",
                  boxShadow: remember
                    ? "0 0 8px rgba(124,58,237,0.5)"
                    : "none",
                }}
              >
                {remember && (
                  <svg
                    viewBox="0 0 12 12"
                    className="w-2.5 h-2.5"
                    fill="none"
                    stroke="white"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  >
                    <polyline points="1.5 6 4.5 9 10.5 3" />
                  </svg>
                )}
              </button>
              <span className="text-xs text-violet-300/50 select-none">
                Remember me for 30 days
              </span>
            </div>

            {/* Error Message */}
            {loginError && (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                }}
              >
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4 shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{loginError}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              id="sign-in-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                background: isLoading
                  ? "rgba(124,58,237,0.4)"
                  : "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                boxShadow: isLoading
                  ? "none"
                  : "0 0 30px rgba(124,58,237,0.4), 0 4px 15px rgba(124,58,237,0.3)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 0 50px rgba(124,58,237,0.7), 0 6px 25px rgba(124,58,237,0.5)";
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 0 30px rgba(124,58,237,0.4), 0 4px 15px rgba(124,58,237,0.3)";
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(0)";
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-violet-200 animate-pulse">
                    Syncing Telemetry...
                  </span>
                </>
              ) : (
                <>Sign In to Dashboard <span>→</span></>
              )}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-violet-950/50" />
              <span className="mx-4 text-[10px] text-violet-600 uppercase tracking-widest font-mono">
                Secure Auth
              </span>
              <div className="flex-grow border-t border-violet-950/50" />
            </div>

            {/* SSO */}
            <button
              type="button"
              id="sso-btn"
              className="w-full py-3 rounded-xl text-xs font-medium text-violet-300 hover:text-white transition-all duration-200"
              style={{
                border: "1px solid rgba(139,92,246,0.2)",
                background: "rgba(124,58,237,0.05)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(124,58,237,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(124,58,237,0.05)";
              }}
            >
              Continue with Enterprise SSO
            </button>
          </form>
        </main>

        {/* Footer */}
        <footer>
          <div
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4"
            style={{
              background: "rgba(6,182,212,0.05)",
              border: "1px solid rgba(6,182,212,0.12)",
            }}
          >
            <span className="text-cyan-400 text-xs">🔒</span>
            <span className="text-[11px] text-violet-400/50">
              <span className="text-cyan-400/80 font-medium">
                TLS 1.3 Encrypted
              </span>{" "}
              · SOC 2 Type II · GDPR Compliant
            </span>
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          </div>
          <div className="flex items-center justify-between text-[10px] text-violet-800">
            <span>© 2026 FleetCommand NYC</span>
            <div className="flex gap-3">
              {[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Support", href: "/support" },
              ].map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="hover:text-violet-500 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* ══ RIGHT: 3D Cyber Scene ══ */}
      <div className="relative hidden lg:flex flex-1 flex-col overflow-hidden bg-[#040209]">
        {/* Ambient gradients */}
        <div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* 3D Scene */}
        <Cyber3DScene />

        {/* Left-edge fade into form */}
        <div
          className="absolute inset-y-0 left-0 w-16 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(4,2,9,0.9) 0%, transparent 100%)",
          }}
        />

        {/* Top badge */}
        <div className="relative z-10 flex justify-end p-6">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium text-violet-300"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            LIVE — NYC Metro Area
          </div>
        </div>

        {/* Center label (shows through 3D) */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none">
          <div
            className="px-5 py-2 rounded-full text-[11px] tracking-widest font-mono"
            style={{
              background: "rgba(124,58,237,0.08)",
              border: "1px solid rgba(124,58,237,0.15)",
              backdropFilter: "blur(6px)",
              color: "rgba(167,139,250,0.6)",
            }}
          >
            3D FLEET TELEMETRY GRID
          </div>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10 p-10">
          <h2 className="text-3xl xl:text-4xl font-bold text-white leading-tight mb-3">
            Real-Time Fleet
            <br />
            <span
              style={{
                background:
                  "linear-gradient(90deg, #8b5cf6, #a78bfa, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Intelligence
            </span>
          </h2>
          <p className="text-sm text-violet-300/40 max-w-xs leading-relaxed">
            Monitor 2,800+ active vehicles across all five boroughs with
            sub-second data refresh and dynamic 3D telemetry.
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-6">
            {[
              { label: "Vehicles", val: "2,847", color: "#8b5cf6" },
              { label: "Zones", val: "94", color: "#06b6d4" },
              { label: "Uptime", val: "99.97%", color: "#10b981" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center px-4 py-2.5 rounded-xl"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <span
                  className="text-lg font-bold"
                  style={{ color: item.color }}
                >
                  {item.val}
                </span>
                <span className="text-[10px] text-violet-600 uppercase tracking-wider mt-0.5">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pb-4 px-10 text-[10px] text-violet-800 font-mono tracking-widest uppercase">
          © 2026 FLEETCOMMAND // OPS_CONTROL_CENTER
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </div>
  );
}
