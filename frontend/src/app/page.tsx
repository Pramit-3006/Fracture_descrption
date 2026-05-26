"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, User, Activity, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Direct FormURLEncoded parameters matching OAuth2 specifications
      const params = new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const res = await fetch("http://localhost:8000/api/v1/auth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        throw new Error("Invalid medical clearance credentials.");
      }

      const data = await res.json();
      
      // Save details to secure localStorage
      localStorage.setItem("osteo_token", data.access_token);
      localStorage.setItem("osteo_username", data.username);
      localStorage.setItem("osteo_role", data.role);
      
      // Push to hospital dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to establish connection to radiology service.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="flex min-h-screen bg-clinical-bg text-slate-100 flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-clinical-accent/10 to-transparent blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-clinical-panel border border-clinical-border rounded-2xl shadow-clinical-glow overflow-hidden backdrop-blur-md">
        {/* Portal Header */}
        <div className="bg-slate-900 px-6 py-8 border-b border-clinical-border text-center flex flex-col items-center gap-3">
          <div className="p-3 bg-clinical-accent/10 rounded-full border border-clinical-accent/30 text-clinical-accent">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-slate-100 uppercase">OsteoInsight Enterprise</h1>
            <p className="text-xs text-clinical-muted mt-1 uppercase tracking-widest font-mono">Radiology Fracture Intelligence Suite</p>
          </div>
        </div>

        {/* HIPAA Notice */}
        <div className="bg-slate-950 px-6 py-3 border-b border-clinical-border text-[10px] text-clinical-muted flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-clinical-emerald shrink-0" />
          <span><strong>HIPAA Security Warning</strong>: Authorized medical staff access only. Activity is monitored and audited.</span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-clinical-crimson/10 border border-clinical-crimson/30 rounded-lg text-xs text-clinical-crimson flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Access Identifier</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-clinical-muted" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username (e.g. dr_jones)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-clinical-accent/70"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Clearance Code (Password)</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-clinical-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (e.g. jones123)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-clinical-accent/70"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-clinical-accent text-slate-950 font-extrabold text-xs uppercase rounded-lg shadow-clinical-glow hover:bg-sky-400 transition"
          >
            {loading ? "Establishing Secure Session..." : "Authorize Portal Entry"}
          </button>
        </form>

        {/* Demo Fast-login options */}
        <div className="px-6 pb-6 pt-2 border-t border-slate-900 bg-slate-950/40 text-xs">
          <span className="text-clinical-muted block mb-2 font-medium">Quick-Authorize Accounts (Simulation Mode):</span>
          <div className="flex gap-2">
            <button 
              onClick={() => handleAutoFill("dr_jones", "jones123")}
              className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-850 text-[10px] font-bold uppercase rounded border border-slate-800 transition text-slate-300 text-center"
            >
              👩‍⚕️ Dr. Jones (Radiologist)
            </button>
            <button 
              onClick={() => handleAutoFill("admin", "admin123")}
              className="flex-1 py-1.5 px-3 bg-slate-900 hover:bg-slate-850 text-[10px] font-bold uppercase rounded border border-slate-800 transition text-slate-300 text-center"
            >
              💻 Admin (Hospital Tech)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
