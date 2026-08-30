"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicWorkerProfile } from "@/lib/db";
import Link from "next/link";

export default function PublicShramIDProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      const data = await getPublicWorkerProfile(userId);
      setProfile(data);
      setLoading(false);
    })();
  }, [userId]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "12px" }}>🆔</div>
          <p style={{ color: "#64748b" }}>Loading Verified ShramID Passport...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "24px" }}>
          <div style={{ fontSize: "40px" }}>❓</div>
          <h2 style={{ color: "#0f172a", marginTop: "12px" }}>ShramID Not Found</h2>
          <p style={{ color: "#64748b", marginTop: "8px" }}>The requested digital work passport does not exist or has been made private.</p>
          <Link href="/" style={{ display: "inline-block", marginTop: "16px", padding: "10px 20px", background: "#2563eb", color: "#fff", borderRadius: "8px", textDecoration: "none" }}>
            Return to ShramID Home
          </Link>
        </div>
      </div>
    );
  }

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(185deg, #0f172a 0%, #1e293b 100%)", color: "#f8fafc", fontFamily: "sans-serif", padding: "24px 16px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        
        {/* TOP BRAND HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "24px" }}>🇮🇳</span>
            <span style={{ fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #38bdf8, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ShramID
            </span>
          </div>
          <span style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
            Official Digital Work Passport
          </span>
        </div>

        {/* MAIN SHRAMID CARD */}
        <div style={{ background: "rgba(255, 255, 255, 0.05)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
          
          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", fontWeight: 700, color: "#fff", flexShrink: 0, boxShadow: "0 4px 12px rgba(37, 99, 235, 0.4)" }}>
              {profile.full_name?.charAt(0) || "W"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700 }}>{profile.full_name}</h1>
                <span style={{ color: "#38bdf8", fontSize: "18px" }}>✓</span>
              </div>
              <p style={{ margin: "4px 0 0 0", color: "#94a3b8", fontSize: "14px" }}>{profile.headline}</p>
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "12px", color: "#cbd5e1" }}>
                <span>📍 {profile.city}</span>
                <span>⏱️ {profile.experience_years} Yrs Exp</span>
                <span>⭐ 4.9 (14 Reviews)</span>
              </div>
            </div>
          </div>

          {/* QR CODE & VERIFICATION EMBED */}
          <div style={{ background: "#ffffff", borderRadius: "16px", padding: "16px", color: "#0f172a", textAlign: "center", marginBottom: "20px" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "#475569", letterSpacing: "0.5px" }}>
              Scan QR to Verify ShramID Credentials
            </p>
            <img
              src={qrApiUrl}
              alt="ShramID QR Code"
              style={{ width: "160px", height: "160px", margin: "0 auto", display: "block" }}
            />
            <div style={{ marginTop: "10px", fontSize: "11px", color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "6px 12px", fontWeight: 600 }}>
              🛡️ Government & Employer Verified Digital Passport
            </div>
          </div>

          {/* VERIFIED SKILLS */}
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8", marginBottom: "10px" }}>
              Verified Trade Skills
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {profile.skills.length > 0 ? (
                profile.skills.map((s: any) => (
                  <span
                    key={s.id || s.name}
                    style={{
                      background: "rgba(37, 99, 235, 0.2)",
                      border: "1px solid rgba(59, 130, 246, 0.4)",
                      color: "#93c5fd",
                      padding: "6px 12px",
                      borderRadius: "20px",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    ⚡ {s.name} ({s.proficiency})
                  </span>
                ))
              ) : (
                <span style={{ color: "#94a3b8", fontSize: "13px" }}>Skilled Trade Professional</span>
              )}
            </div>
          </div>

          {/* METRICS & AVAILABILITY */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "12px", borderRadius: "12px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Work Availability</span>
              <strong style={{ display: "block", fontSize: "14px", marginTop: "4px", color: "#4ade80" }}>
                {profile.availability}
              </strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", padding: "12px", borderRadius: "12px" }}>
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>Passport Score</span>
              <strong style={{ display: "block", fontSize: "14px", marginTop: "4px", color: "#38bdf8" }}>
                {profile.profile_completion}% Verified
              </strong>
            </div>
          </div>

          {/* SHARE ACTION BUTTONS */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={handleCopy}
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: copied ? "#16a34a" : "#2563eb",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                transition: "background 0.2s ease",
              }}
            >
              {copied ? "Link Copied ✓" : "🔗 Copy Link"}
            </button>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out ${profile.full_name}'s official Verified ShramID Work Passport: ${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                padding: "12px",
                borderRadius: "10px",
                border: "none",
                background: "#25d366",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              💬 WhatsApp Share
            </a>
            <Link
              href="/"
              style={{
                padding: "12px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Hire Worker
            </Link>
          </div>

        </div>

        {/* FOOTER */}
        <p style={{ textAlign: "center", fontSize: "12px", color: "#64748b", marginTop: "24px" }}>
          ShramID Digital Work Identity Platform · Workforce Connect '26
        </p>

      </div>
    </div>
  );
}
