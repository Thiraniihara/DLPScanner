import { useState, useEffect, useCallback } from "react";

// ─── API Service ─────────────────────────────────────────────────────────────

const API = "http://localhost:8000/api";

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("dlp_token");
  const res = await fetch(API + path, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, size = 20, color = "currentColor", strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  scan: "M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M7 12h10M12 7v10",
  dashboard: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  policy: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  log: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10",
  chevronRight: "M9 18l6-6-6-6",
  check: "M20 6L9 17l-5-5",
  x: "M18 6L6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2",
  toggle: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f0f4f8;
    --surface: #ffffff;
    --surface2: #f1f5f9;
    --border: #cbd5e1;
    --accent: #0d9488;
    --accent2: #2563eb;
    --danger: #dc2626;
    --warning: #ea580c;
    --text: #1e293b;
    --muted: #64748b;
    --card: #ffffff;
    --glow: rgba(13, 148, 136, 0.12);
  }

  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; font-size: 16px; }

  .mono { font-family: 'Space Mono', monospace; }

  .app { display: flex; min-height: 100vh; }

  /* ── Sidebar ── */
  .sidebar {
    width: 240px; min-width: 240px; background: var(--surface);
    border-right: 1px solid var(--border); display: flex; flex-direction: column;
    padding: 24px 0; position: sticky; top: 0; height: 100vh;
    box-shadow: 2px 0 8px rgba(0,0,0,0.04);
  }
  .sidebar-logo {
    padding: 0 24px 28px; border-bottom: 1px solid var(--border);
  }
  .logo-mark {
    display: flex; align-items: center; gap: 10px;
  }
  .logo-icon {
    width: 36px; height: 36px; background: var(--accent);
    border-radius: 8px; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 20px var(--glow);
  }
  .logo-text { font-family: 'Space Mono', monospace; font-size: 15px; font-weight: 700; color: var(--text); }
  .logo-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .nav { flex: 1; padding: 16px 12px; display: flex; flex-direction: column; gap: 4px; }
  .nav-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 12px;
    border-radius: 8px; cursor: pointer; transition: all 0.15s; color: var(--muted);
    font-size: 15px; font-weight: 500; border: 1px solid transparent;
  }
  .nav-item:hover { background: var(--surface2); color: var(--text); }
  .nav-item.active {
    background: rgba(13,148,136,0.08); color: var(--accent);
    border-color: rgba(13,148,136,0.2);
  }
  .nav-divider { height: 1px; background: var(--border); margin: 8px 0; }
  .sidebar-footer { padding: 16px 12px; border-top: 1px solid var(--border); margin-top: auto; }
  .user-badge {
    display: flex; align-items: center; gap: 10px; padding: 10px 12px;
    background: var(--surface2); border-radius: 8px; margin-bottom: 8px;
  }
  .user-avatar {
    width: 32px; height: 32px; background: var(--accent); border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #ffffff; flex-shrink: 0;
  }
  .user-name { font-size: 14px; font-weight: 500; }
  .user-role { font-size: 12px; color: var(--muted); }

  /* ── Main Content ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar {
    height: 60px; border-bottom: 1px solid var(--border); background: var(--surface);
    display: flex; align-items: center; padding: 0 28px; gap: 16px;
    justify-content: space-between; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .page-title { font-size: 18px; font-weight: 600; }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .badge {
    display: inline-flex; align-items: center; padding: 3px 10px;
    border-radius: 20px; font-size: 12px; font-weight: 600;
    font-family: 'Space Mono', monospace;
  }
  .badge-critical { background: rgba(220,38,38,0.08); color: #dc2626; border: 1px solid rgba(220,38,38,0.25); }
  .badge-high { background: rgba(234,88,12,0.08); color: #ea580c; border: 1px solid rgba(234,88,12,0.25); }
  .badge-medium { background: rgba(37,99,235,0.08); color: #2563eb; border: 1px solid rgba(37,99,235,0.25); }
  .badge-low { background: rgba(100,116,139,0.1); color: #64748b; border: 1px solid rgba(100,116,139,0.25); }
  .badge-success { background: rgba(13,148,136,0.1); color: var(--accent); border: 1px solid rgba(13,148,136,0.3); }

  .content { flex: 1; padding: 28px; overflow-y: auto; }

  /* ── Cards ── */
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .card-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .card-muted { font-size: 13px; color: var(--muted); }

  /* ── Stat Cards ── */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 20px; position: relative; overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  }
  .stat-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
  }
  .stat-card.teal::before { background: var(--accent); }
  .stat-card.blue::before { background: var(--accent2); }
  .stat-card.red::before { background: var(--danger); }
  .stat-card.orange::before { background: var(--warning); }
  .stat-label { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
  .stat-value { font-family: 'Space Mono', monospace; font-size: 30px; font-weight: 700; }
  .stat-value.teal { color: var(--accent); }
  .stat-value.blue { color: var(--accent2); }
  .stat-value.red { color: var(--danger); }
  .stat-value.orange { color: var(--warning); }
  .stat-sub { font-size: 12px; color: var(--muted); margin-top: 6px; }

  /* ── Grid Layouts ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }

  /* ── Table ── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 12px; color: var(--muted); font-weight: 600;
       padding: 8px 12px; border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 12px 12px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(0,0,0,0.02); }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
    border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;
    border: 1px solid transparent; transition: all 0.15s; font-family: inherit;
  }
  .btn-primary { background: var(--accent); color: #ffffff; }
  .btn-primary:hover { background: #0f766e; box-shadow: 0 0 20px var(--glow); }
  .btn-outline { background: transparent; border-color: var(--border); color: var(--text); }
  .btn-outline:hover { background: var(--surface2); }
  .btn-danger { background: rgba(220,38,38,0.06); border-color: rgba(220,38,38,0.25); color: var(--danger); }
  .btn-danger:hover { background: rgba(220,38,38,0.12); }
  .btn-sm { padding: 5px 10px; font-size: 13px; }

  /* ── Forms ── */
  .form-group { margin-bottom: 16px; }
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 6px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
  input, textarea, select {
    width: 100%; background: var(--surface2); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 15px;
    font-family: inherit; transition: border-color 0.15s; outline: none;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(13,148,136,0.1); }
  textarea { resize: vertical; min-height: 120px; }
  select option { background: var(--surface); }

  /* ── Risk Meter ── */
  .risk-bar { height: 6px; border-radius: 3px; background: var(--surface2); overflow: hidden; }
  .risk-fill { height: 100%; border-radius: 3px; transition: width 0.5s; }

  /* ── Home Page ── */
  .home-hero {
    min-height: 100vh; display: flex; flex-direction: column;
    background: var(--bg);
  }
  .home-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 48px; border-bottom: 1px solid var(--border);
    background: rgba(240,244,248,0.95); backdrop-filter: blur(12px);
    position: sticky; top: 0; z-index: 10;
  }
  .hero-section {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center; padding: 80px 40px;
    position: relative; overflow: hidden;
  }
  .hero-bg {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,148,136,0.06), transparent),
                radial-gradient(ellipse 60% 40% at 80% 80%, rgba(37,99,235,0.04), transparent);
  }
  .hero-eyebrow {
    font-family: 'Space Mono', monospace; font-size: 12px; color: var(--accent);
    letter-spacing: 0.2em; text-transform: uppercase; margin-bottom: 20px;
    padding: 6px 16px; border: 1px solid rgba(13,148,136,0.3);
    border-radius: 20px; background: rgba(13,148,136,0.06); display: inline-block;
  }
  .hero-title {
    font-size: clamp(36px, 6vw, 72px); font-weight: 300; line-height: 1.1;
    margin-bottom: 24px; letter-spacing: -0.02em;
  }
  .hero-title strong { font-weight: 700; color: var(--accent); }
  .hero-desc {
    font-size: 19px; color: var(--muted); max-width: 560px; margin: 0 auto 40px;
    line-height: 1.6;
  }
  .hero-cta { display: flex; gap: 16px; justify-content: center; }
  .btn-hero {
    padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 500;
    cursor: pointer; border: none; font-family: inherit; transition: all 0.2s;
  }
  .btn-hero-primary {
    background: var(--accent); color: #ffffff;
    box-shadow: 0 0 40px rgba(13,148,136,0.25);
  }
  .btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(13,148,136,0.35); }
  .btn-hero-outline {
    background: transparent; color: var(--text);
    border: 1px solid var(--border);
  }
  .btn-hero-outline:hover { background: var(--surface2); }
  .features-section {
    padding: 80px 48px; border-top: 1px solid var(--border);
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
    background: var(--surface);
  }
  .feature-card {
    background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
    padding: 28px; transition: border-color 0.2s;
  }
  .feature-card:hover { border-color: rgba(13,148,136,0.35); box-shadow: 0 4px 16px rgba(13,148,136,0.08); }
  .feature-icon {
    width: 44px; height: 44px; background: rgba(13,148,136,0.08);
    border-radius: 10px; display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px; border: 1px solid rgba(13,148,136,0.15);
  }
  .feature-title { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
  .feature-desc { font-size: 15px; color: var(--muted); line-height: 1.6; }

  /* ── Login ── */
  .login-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg);
    background-image: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(13,148,136,0.05), transparent);
  }
  .login-box {
    width: 420px; background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.08);
  }
  .login-logo { text-align: center; margin-bottom: 32px; }
  .login-logo .logo-icon { margin: 0 auto 12px; }
  .login-title { font-size: 24px; font-weight: 600; text-align: center; margin-bottom: 4px; }
  .login-sub { font-size: 15px; color: var(--muted); text-align: center; margin-bottom: 28px; }
  .error-msg {
    background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.25);
    border-radius: 8px; padding: 10px 14px; font-size: 14px; color: var(--danger); margin-bottom: 16px;
  }
  .demo-hint {
    background: rgba(13,148,136,0.05); border: 1px solid rgba(13,148,136,0.2);
    border-radius: 8px; padding: 10px 14px; font-size: 13px; color: var(--muted); margin-bottom: 20px;
    font-family: 'Space Mono', monospace;
  }

  /* ── Scan Panel ── */
  .drop-zone {
    border: 2px dashed var(--border); border-radius: 12px; padding: 40px;
    text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 20px;
    background: var(--surface2);
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: var(--accent); background: rgba(13,148,136,0.04);
  }
  .drop-icon { margin: 0 auto 12px; color: var(--muted); }
  .findings-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
  .finding-item {
    background: var(--surface2); border: 1px solid var(--border); border-radius: 8px;
    padding: 12px 14px; display: flex; align-items: flex-start; gap: 12px;
  }
  .finding-type {
    font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700;
    min-width: 120px; padding-top: 1px;
  }
  .finding-context { font-size: 13px; color: var(--muted); margin-top: 4px; font-family: 'Space Mono', monospace; }
  .finding-masked { font-family: 'Space Mono', monospace; font-size: 14px; font-weight: 600; color: var(--accent); }

  /* ── Risk Score ── */
  .risk-circle {
    width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column;
    align-items: center; justify-content: center; border: 3px solid;
    font-family: 'Space Mono', monospace; flex-shrink: 0;
  }
  .risk-num { font-size: 24px; font-weight: 700; line-height: 1; }
  .risk-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }

  /* ── Chart Bars ── */
  .chart-bar-group { display: flex; flex-direction: column; gap: 8px; }
  .chart-bar-row { display: flex; align-items: center; gap: 10px; }
  .chart-bar-label { font-size: 12px; color: var(--muted); min-width: 140px; font-family: 'Space Mono', monospace; }
  .chart-bar-track { flex: 1; height: 8px; background: var(--surface2); border-radius: 4px; overflow: hidden; }
  .chart-bar-fill { height: 100%; border-radius: 4px; background: var(--accent); transition: width 0.8s ease; }
  .chart-bar-count { font-size: 12px; color: var(--muted); min-width: 40px; text-align: right; font-family: 'Space Mono', monospace; }

  /* ── Toggle ── */
  .toggle { position: relative; width: 40px; height: 22px; flex-shrink: 0; cursor: pointer; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider {
    position: absolute; inset: 0; background: var(--surface2);
    border-radius: 22px; border: 1px solid var(--border); transition: 0.2s;
  }
  .toggle-slider::before {
    content: ''; position: absolute; width: 16px; height: 16px;
    left: 2px; top: 2px; background: var(--muted); border-radius: 50%; transition: 0.2s;
  }
  .toggle input:checked + .toggle-slider { background: rgba(13,148,136,0.15); border-color: var(--accent); }
  .toggle input:checked + .toggle-slider::before { background: var(--accent); transform: translateX(18px); }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; z-index: 100;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
    padding: 32px; width: 480px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.12);
  }
  .modal-title { font-size: 20px; font-weight: 600; margin-bottom: 24px; }

  /* ── Empty ── */
  .empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
  .empty-icon { margin: 0 auto 16px; opacity: 0.4; }
  .empty-title { font-size: 17px; font-weight: 500; margin-bottom: 8px; }
  .empty-desc { font-size: 14px; }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  /* ── Animations ── */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  .fade-in { animation: fadeIn 0.3s ease; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse { animation: pulse 2s infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.8s linear infinite; }

  .sep { height: 1px; background: var(--border); margin: 16px 0; }
  .flex { display: flex; }
  .items-center { align-items: center; }
  .gap-2 { gap: 8px; }
  .gap-3 { gap: 12px; }
  .ml-auto { margin-left: auto; }
  .text-muted { color: var(--muted); font-size: 14px; }
  .text-sm { font-size: 13px; }
  .mb-4 { margin-bottom: 16px; }
  .mb-6 { margin-bottom: 24px; }
  .fw-600 { font-weight: 600; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .status-dot.green { background: var(--accent); box-shadow: 0 0 8px var(--accent); }
  .status-dot.red { background: var(--danger); }
  .status-dot.blue { background: var(--accent2); }
  .status-dot.grey { background: var(--muted); }
`;

// ─── Utility Components ───────────────────────────────────────────────────────

const RiskBadge = ({ score }) => {
  const color = score >= 75 ? "var(--danger)" : score >= 50 ? "var(--warning)" : score >= 25 ? "var(--accent2)" : "var(--muted)";
  const label = score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  return (
    <div className="risk-circle" style={{ borderColor: color, color }}>
      <span className="risk-num">{score}</span>
      <span className="risk-label">{label}</span>
    </div>
  );
};

const SeverityBadge = ({ level }) => (
  <span className={`badge badge-${level?.toLowerCase()}`}>{level}</span>
);

const StatusDot = ({ status }) => {
  const cls = status === "completed" ? "green" : status === "processing" ? "blue" : status === "failed" ? "red" : "grey";
  return <span className={`status-dot ${cls}`} />;
};

// ─── Home Page ────────────────────────────────────────────────────────────────

function HomePage({ onLogin }) {
  const features = [
    { icon: Icons.shield, title: "DistilBERT Detection", desc: "Fine-tuned transformer model achieving 88% F1-score across 60+ PII entity types including SSN, credit cards, emails, and more." },
    { icon: Icons.scan, title: "Multi-Format Scanning", desc: "Scan TXT, DOCX, PDF, JPEG, and PNG files. Supports both text-based and image-embedded content via OCR." },
    { icon: Icons.policy, title: "Policy Engine", desc: "Configurable detection policies with sensitivity levels (Low → Critical) and automated responses: alert or block." },
    { icon: Icons.dashboard, title: "Real-Time Dashboard", desc: "Live incident monitoring, risk analytics, trend charts, and exportable reports for compliance and audit." },
    { icon: Icons.alert, title: "Instant Alerts", desc: "Real-time notifications on policy violations with full context, masked values, and recommended remediation." },
    { icon: Icons.log, title: "Audit Trail", desc: "Comprehensive audit logs tracking every scan, policy change, and login for GDPR and HIPAA compliance." },
  ];

  return (
    <div className="home-hero">
      <nav className="home-nav">
        <div className="logo-mark">
          <div className="logo-icon"><Icon d={Icons.shield} size={20} color="#ffffff" strokeWidth={2} /></div>
          <div>
            <div className="logo-text">DLP SCANNER</div>
            <div className="logo-sub">AI-Powered Protection</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-outline" onClick={() => onLogin("login")}>Sign In</button>
          <button className="btn btn-primary" onClick={() => onLogin("register")}>Get Started →</button>
        </div>
      </nav>
      <div className="hero-section">
        <div className="hero-bg" />
        <div className="hero-eyebrow">PUSL3190 — AI Research Project</div>
        <h1 className="hero-title">Stop Data Leaks<br />Before They <strong>Happen</strong></h1>
        <p className="hero-desc">
          Enterprise-grade PII detection powered by DistilBERT NLP. Scan documents, enforce policies,
          and maintain full audit trails — built for SMEs and educational institutions.
        </p>
        <div className="hero-cta">
          <button className="btn-hero btn-hero-primary" onClick={() => onLogin("register")}>Start Scanning Free</button>
          <button className="btn-hero btn-hero-outline" onClick={() => onLogin("login")}>View Dashboard →</button>
        </div>
        <div style={{ display: "flex", gap: 40, marginTop: 60, opacity: 0.7 }}>
          {[["88%", "F1 Score"], ["60+", "PII Types"], ["<3s", "Scan Speed"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 30, fontWeight: 700, color: "var(--accent)" }}>{v}</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="features-section">
        {features.map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon"><Icon d={f.icon} size={22} color="var(--accent)" /></div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", padding: "32px 48px", borderTop: "1px solid var(--border)", background: "var(--surface)", color: "var(--muted)", fontSize: 14 }}>
        PUSL3190 Computing Project · AI-Powered Data Loss Prevention Scanner · Model: DistilBERT (F1=0.88)
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin, initMode = "login" }) {
  const [mode, setMode] = useState(initMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      } else {
        data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password, full_name: name }) });
      }
      localStorage.setItem("dlp_token", data.token);
      localStorage.setItem("dlp_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box fade-in">
        <div className="login-logo">
          <div className="logo-icon" style={{ width: 48, height: 48 }}>
            <Icon d={Icons.shield} size={26} color="#ffffff" strokeWidth={2} />
          </div>
        </div>
        <h2 className="login-title">{mode === "login" ? "Welcome back" : "Create account"}</h2>
        <p className="login-sub">{mode === "login" ? "Sign in to the DLP Scanner" : "Join the DLP Scanner platform"}</p>
        {mode === "login" && (
          <div className="demo-hint">
            Demo: admin@dlpscanner.com / admin123
          </div>
        )}
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="form-group">
              <label>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
            </div>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px" }} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign In →" : "Create Account →"}
          </button>
        </form>
        <div className="sep" />
        <p className="text-muted" style={{ textAlign: "center" }}>
          {mode === "login" ? "No account? " : "Already registered? "}
          <span style={{ color: "var(--accent)", cursor: "pointer" }}
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Create one" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/dashboard/stats").then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--muted)" }}>Loading dashboard...</div>;
  if (!stats) return null;

  const maxCount = Math.max(...(stats.findings_by_type?.map(f => f.count) || [1]));

  return (
    <div className="fade-in">
      <div className="stats-grid">
        <div className="stat-card teal">
          <div className="stat-label">Total Scans</div>
          <div className="stat-value teal">{stats.total_scans}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Total Findings</div>
          <div className="stat-value red">{stats.total_findings}</div>
          <div className="stat-sub">{stats.critical_findings} critical</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value blue">{stats.active_policies}</div>
          <div className="stat-sub">Enforced</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Avg Risk Score</div>
          <div className="stat-value orange">{stats.avg_risk_score}</div>
          <div className="stat-sub">Out of 100</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Scans</span>
            <span className="card-muted">Last 5</span>
          </div>
          {stats.recent_scans?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon d={Icons.scan} size={36} /></div>
              <div className="empty-title">No scans yet</div>
              <div className="empty-desc">Run your first scan in the Scanner tab</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>File</th><th>Status</th><th>Findings</th><th>Risk</th></tr></thead>
                <tbody>
                  {stats.recent_scans?.map(s => (
                    <tr key={s.id}>
                      <td style={{ fontFamily: "'Space Mono',monospace", fontSize: 13 }}>{s.filename?.substring(0, 24)}</td>
                      <td><div className="flex items-center gap-2"><StatusDot status={s.status} />{s.status}</div></td>
                      <td><span className="mono" style={{ color: s.total_findings > 0 ? "var(--warning)" : "var(--muted)" }}>{s.total_findings}</span></td>
                      <td>
                        <div className="risk-bar" style={{ width: 60 }}>
                          <div className="risk-fill" style={{ width: `${s.risk_score}%`, background: s.risk_score >= 75 ? "var(--danger)" : s.risk_score >= 50 ? "var(--warning)" : "var(--accent)" }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Findings by Entity Type</span>
          </div>
          {stats.findings_by_type?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon d={Icons.alert} size={36} /></div>
              <div className="empty-title">No findings yet</div>
            </div>
          ) : (
            <div className="chart-bar-group">
              {stats.findings_by_type?.map(f => (
                <div key={f.entity_type} className="chart-bar-row">
                  <div className="chart-bar-label">{f.entity_type}</div>
                  <div className="chart-bar-track">
                    <div className="chart-bar-fill" style={{ width: `${(f.count / maxCount) * 100}%` }} />
                  </div>
                  <div className="chart-bar-count">{f.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">7-Day Scan Activity</span>
          <span className="card-muted">Scans & findings trend</span>
        </div>
        {stats.scan_trend?.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="empty-desc">No scan activity in the last 7 days</div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 80 }}>
            {stats.scan_trend?.map(d => (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ width: "100%", background: "var(--accent)", opacity: 0.6, borderRadius: 4, minHeight: 4,
                  height: `${Math.max(4, (d.scans / Math.max(...stats.scan_trend.map(x => x.scans), 1)) * 60)}px` }} />
                <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "'Space Mono',monospace" }}>
                  {d.day?.slice(5)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Scanner Page ─────────────────────────────────────────────────────────────

function ScannerPage() {
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("manual_input.txt");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scans, setScans] = useState([]);

  useEffect(() => {
    apiFetch("/scans").then(setScans).catch(console.error);
  }, [result]);

  const scan = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const r = await apiFetch("/scans/text", { method: "POST", body: JSON.stringify({ text, filename }) });
      setResult(r);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file) => {
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const token = localStorage.getItem("dlp_token");
      const res = await fetch(`${API}/scans/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const r = await res.json();
      setResult(r);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const severityColor = (s) => s === "Critical" ? "var(--danger)" : s === "High" ? "var(--warning)" : s === "Medium" ? "var(--accent2)" : "var(--muted)";

  return (
    <div className="fade-in">
      <div className="grid-2" style={{ marginBottom: 0 }}>
        <div>
          <div className="card mb-4">
            <div className="card-header"><span className="card-title">Upload File</span></div>
            <div className={`drop-zone ${dragOver ? "drag-over" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) uploadFile(f); }}
              onClick={() => document.getElementById("file-input").click()}>
              <div className="drop-icon"><Icon d={Icons.upload} size={32} color="var(--muted)" /></div>
              <div style={{ fontWeight: 500, marginBottom: 6 }}>Drop file or click to upload</div>
              <div className="text-muted">TXT, DOCX, PDF, JPEG, PNG — up to 50MB</div>
              <input id="file-input" type="file" hidden accept=".txt,.docx,.pdf,.jpg,.jpeg,.png"
                onChange={e => { const f = e.target.files[0]; if (f) uploadFile(f); }} />
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Paste Text</span></div>
            <div className="form-group">
              <label>Scan Identifier</label>
              <input value={filename} onChange={e => setFilename(e.target.value)} placeholder="document_name.txt" />
            </div>
            <div className="form-group">
              <label>Text to Scan</label>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder={"Paste text containing potential PII here...\n\nExample: My name is John Smith, email john.smith@company.com, SSN 123-45-6789"} />
            </div>
            <button className="btn btn-primary" onClick={scan} disabled={loading || !text.trim()}>
              <Icon d={Icons.scan} size={16} color="#ffffff" />
              {loading ? "Scanning..." : "Run Scan"}
            </button>
          </div>
        </div>

        <div className="card" style={{ height: "fit-content" }}>
          <div className="card-header">
            <span className="card-title">Scan Results</span>
            {result && <RiskBadge score={result.risk_score} />}
          </div>
          {!result ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon d={Icons.eye} size={36} /></div>
              <div className="empty-title">No results yet</div>
              <div className="empty-desc">Upload a file or paste text to begin scanning</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, marginBottom: 16, padding: "12px 14px", background: "var(--surface2)", borderRadius: 8 }}>
                <div>
                  <div className="text-muted text-sm">File</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, marginTop: 2 }}>{result.filename}</div>
                </div>
                <div style={{ marginLeft: "auto", textAlign: "right" }}>
                  <div className="text-muted text-sm">Findings</div>
                  <div style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 22, color: result.total_findings > 0 ? "var(--warning)" : "var(--accent)" }}>
                    {result.total_findings}
                  </div>
                </div>
              </div>
              {result.findings?.length === 0 ? (
                <div className="empty-state" style={{ padding: 30 }}>
                  <div style={{ color: "var(--accent)", fontSize: 32, marginBottom: 8 }}>✓</div>
                  <div className="empty-title">All Clear</div>
                  <div className="empty-desc">No PII detected in this content</div>
                </div>
              ) : (
                <div className="findings-list">
                  {result.findings?.map((f, i) => (
                    <div key={i} className="finding-item">
                      <div>
                        <div className="finding-type" style={{ color: severityColor(f.severity) }}>{f.entity_type}</div>
                        <SeverityBadge level={f.severity} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="finding-masked">{f.masked_value}</div>
                        <div className="finding-context">{f.context?.substring(0, 80)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <span className="card-title">Scan History</span>
          <span className="card-muted">{scans.length} total</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>File</th><th>Type</th><th>Status</th><th>Findings</th><th>Risk Score</th><th>Scanned By</th><th>Date</th></tr></thead>
            <tbody>
              {scans.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>No scans yet</td></tr>
              ) : scans.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: "'Space Mono',monospace", fontSize: 13 }}>{s.filename}</td>
                  <td><span className="badge badge-medium">{s.file_type?.toUpperCase()}</span></td>
                  <td><div className="flex items-center gap-2"><StatusDot status={s.status} />{s.status}</div></td>
                  <td style={{ color: s.total_findings > 0 ? "var(--warning)" : "var(--muted)", fontFamily: "'Space Mono',monospace" }}>{s.total_findings}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="risk-bar" style={{ width: 50 }}>
                        <div className="risk-fill" style={{ width: `${s.risk_score}%`, background: s.risk_score >= 75 ? "var(--danger)" : s.risk_score >= 50 ? "var(--warning)" : "var(--accent)" }} />
                      </div>
                      <span className="mono text-sm">{s.risk_score}</span>
                    </div>
                  </td>
                  <td className="text-muted">{s.scanned_by_name || "—"}</td>
                  <td className="text-muted text-sm">{s.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Policies Page ────────────────────────────────────────────────────────────

function PoliciesPage({ user }) {
  const [policies, setPolicies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", data_types: [], sensitivity_level: "High", action: "alert" });
  const isAdmin = user?.role === "admin";

  const PII_TYPES = ["EMAIL", "PHONENUMBER", "SSN", "CREDITCARDNUMBER", "IBAN", "IPV4", "IPV6", "PASSWORD", "USERNAME", "DATE", "URL", "MAC"];

  const load = () => apiFetch("/policies").then(setPolicies);
  useEffect(() => { load(); }, []);

  const save = async () => {
    await apiFetch("/policies", { method: "POST", body: JSON.stringify(form) });
    setShowModal(false);
    setForm({ name: "", description: "", data_types: [], sensitivity_level: "High", action: "alert" });
    load();
  };

  const toggle = async (id) => { await apiFetch(`/policies/${id}/toggle`, { method: "PUT" }); load(); };
  const del = async (id) => { if (confirm("Delete this policy?")) { await apiFetch(`/policies/${id}`, { method: "DELETE" }); load(); } };

  const toggleType = (t) => setForm(f => ({
    ...f, data_types: f.data_types.includes(t) ? f.data_types.filter(x => x !== t) : [...f.data_types, t]
  }));

  return (
    <div className="fade-in">
      <div className="flex items-center gap-2 mb-6">
        <div>
          <div className="text-muted">Manage detection rules and automated responses</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary ml-auto" onClick={() => setShowModal(true)}>
            <Icon d={Icons.plus} size={14} color="#ffffff" /> New Policy
          </button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {policies.map(p => (
          <div key={p.id} className="card" style={{ opacity: p.enabled ? 1 : 0.55 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span className="fw-600">{p.name}</span>
                  <SeverityBadge level={p.sensitivity_level} />
                  <span className={`badge ${p.action === "block" ? "badge-critical" : "badge-medium"}`}>{p.action.toUpperCase()}</span>
                  {!p.enabled && <span className="badge badge-low">DISABLED</span>}
                </div>
                <div className="text-muted">{p.description}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {JSON.parse(p.data_types || "[]").map(t => (
                    <span key={t} style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, padding: "3px 8px",
                      background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted)" }}>{t}</span>
                  ))}
                </div>
              </div>
              {isAdmin && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <label className="toggle">
                    <input type="checkbox" checked={!!p.enabled} onChange={() => toggle(p.id)} />
                    <span className="toggle-slider" />
                  </label>
                  <button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>
                    <Icon d={Icons.trash} size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in">
            <div className="modal-title">Create Detection Policy</div>
            <div className="form-group">
              <label>Policy Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Customer PII Protection" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this policy detect?" />
            </div>
            <div className="form-group">
              <label>PII Data Types to Detect</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {PII_TYPES.map(t => (
                  <span key={t} onClick={() => toggleType(t)}
                    style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                      background: form.data_types.includes(t) ? "rgba(13,148,136,0.1)" : "var(--surface2)",
                      border: `1px solid ${form.data_types.includes(t) ? "rgba(13,148,136,0.35)" : "var(--border)"}`,
                      color: form.data_types.includes(t) ? "var(--accent)" : "var(--muted)" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label>Sensitivity Level</label>
                <select value={form.sensitivity_level} onChange={e => setForm(f => ({ ...f, sensitivity_level: e.target.value }))}>
                  <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Automated Action</label>
                <select value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
                  <option value="alert">Alert</option><option value="block">Block</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={save} disabled={!form.name || form.data_types.length === 0}>Save Policy</button>
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Audit Log Page ───────────────────────────────────────────────────────────

function AuditPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { apiFetch("/audit-logs").then(setLogs).catch(console.error); }, []);

  const actionColor = (a) => a === "LOGIN" ? "var(--accent)" : a.includes("SCAN") ? "var(--accent2)" : a.includes("CREATE") ? "var(--warning)" : a === "DELETE_POLICY" ? "var(--danger)" : "var(--muted)";

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <span className="card-title">Audit Trail</span>
          <span className="card-muted">{logs.length} events</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Resource</th><th>Details</th></tr></thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>No audit events yet</td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td className="text-muted text-sm mono">{l.created_at?.slice(0, 16)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 11 }}>
                        {l.full_name?.[0] || "?"}
                      </div>
                      <span style={{ fontSize: 14 }}>{l.full_name || "System"}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: actionColor(l.action),
                      padding: "3px 8px", background: "var(--surface2)", borderRadius: 4, border: "1px solid var(--border)" }}>
                      {l.action}
                    </span>
                  </td>
                  <td className="text-muted mono text-sm">{l.resource?.substring(0, 20) || "—"}</td>
                  <td className="text-muted text-sm">{l.details?.substring(0, 50) || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── System Info Page ─────────────────────────────────────────────────────────

function SystemPage({ user }) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (user?.role === "admin") apiFetch("/users").then(setUsers).catch(console.error);
  }, []);

  const ModelCard = ({ name, selected, f1, precision, recall, pros, cons }) => (
    <div className="card" style={{ borderColor: selected ? "rgba(13,148,136,0.4)" : "var(--border)", position: "relative" }}>
      {selected && (
        <div style={{ position: "absolute", top: -1, left: -1, right: -1, height: 3, background: "var(--accent)", borderRadius: "12px 12px 0 0" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 15, fontWeight: 700 }}>{name}</div>
        {selected && <span className="badge badge-success">✓ SELECTED</span>}
      </div>
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        {[["F1 Score", f1, "var(--accent)"], ["Precision", precision, "var(--accent2)"], ["Recall", recall, "var(--warning)"]].map(([l, v, c]) => (
          <div key={l}>
            <div className="text-muted text-sm">{l}</div>
            <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 22, fontWeight: 700, color: c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: "var(--accent)", marginBottom: 6 }}>Advantages</div>
        {pros.map(p => <div key={p} className="text-muted text-sm" style={{ marginBottom: 3 }}>↑ {p}</div>)}
      </div>
      <div>
        <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 6 }}>Limitations</div>
        {cons.map(c => <div key={c} className="text-muted text-sm" style={{ marginBottom: 3 }}>↓ {c}</div>)}
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="card mb-4">
        <div className="card-header"><span className="card-title">Model Selection Analysis</span></div>
        <div className="text-muted mb-4" style={{ fontSize: 15 }}>
          Two NER models were evaluated on the <span className="mono" style={{ color: "var(--accent)" }}>ai4privacy/pii-masking-200k</span> dataset
          (15% sample, 31,389 examples, 60+ PII entity types). The DistilBERT fine-tuned model was selected.
        </div>
        <div className="grid-2">
          <ModelCard
            name="DistilBERT (Transformer)"
            selected
            f1="0.880"
            precision="0.865"
            recall="0.896"
            pros={["Superior contextual understanding", "60+ entity types", "High recall (96-99%) on crypto/network PII", "Production-ready via Hugging Face"]}
            cons={["Higher compute (GPU recommended)", "Larger model footprint (~268MB)", "Slower inference vs rule-based"]}
          />
          <ModelCard
            name="spaCy NER"
            selected={false}
            f1="~0.45"
            precision="~0.42"
            recall="~0.50"
            pros={["Lightweight & fast", "Low memory footprint", "Easy to deploy"]}
            cons={["Trained on only 2,000 samples", "Misclassifies entity types (e.g. STREET for FIRSTNAME)", "Low precision on structured PII", "Not production-ready for this task"]}
          />
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header"><span className="card-title">System Architecture</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {[
            ["Frontend", "React 18 + Vite", "Component-based SPA with real-time updates and light theme UI"],
            ["Backend", "FastAPI (Python)", "Async REST API with automatic OpenAPI docs and JWT auth"],
            ["Database", "SQLite 3", "Lightweight relational DB for scans, policies, users, and audit logs"],
            ["NLP Model", "DistilBERT-base-uncased", "Fine-tuned on 200k PII samples, regex hybrid for structured data"],
            ["Auth", "SHA-256 + Bearer Token", "Bcrypt-ready password hashing, session-based token management"],
            ["Detection", "Regex + Transformer NER", "Hybrid approach: 99.5%+ on structured, 88% F1 on unstructured PII"],
          ].map(([t, v, d]) => (
            <div key={t} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
              <div className="text-muted text-sm" style={{ marginBottom: 4 }}>{t}</div>
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{v}</div>
              <div className="text-muted text-sm">{d}</div>
            </div>
          ))}
        </div>
      </div>

      {user?.role === "admin" && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">User Management</span>
            <span className="card-muted">{users.length} registered</span>
          </div>
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Last Login</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>{u.full_name?.[0]}</div>
                      {u.full_name}
                    </div>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td><span className={`badge ${u.role === "admin" ? "badge-success" : "badge-medium"}`}>{u.role.toUpperCase()}</span></td>
                  <td className="text-muted text-sm mono">{u.last_login?.slice(0, 16) || "Never"}</td>
                  <td className="text-muted text-sm mono">{u.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dlp_user")); } catch { return null; }
  });
  const [activePage, setActivePage] = useState("dashboard");

  const handleAuthNav = (mode) => { setAuthMode(mode); setPage("auth"); };
  const handleLogin = (u) => { setUser(u); setPage("app"); setActivePage("dashboard"); };
  const handleLogout = async () => {
    try { await apiFetch("/auth/logout", { method: "POST" }); } catch {}
    localStorage.removeItem("dlp_token"); localStorage.removeItem("dlp_user");
    setUser(null); setPage("home");
  };

  useEffect(() => {
    const token = localStorage.getItem("dlp_token");
    if (token && user) setPage("app");
  }, []);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.dashboard },
    { id: "scanner", label: "Scanner", icon: Icons.scan },
    { id: "policies", label: "Policies", icon: Icons.policy },
    { id: "audit", label: "Audit Log", icon: Icons.log },
    { id: "system", label: "System", icon: Icons.shield },
  ];

  const pageTitle = { dashboard: "Dashboard", scanner: "PII Scanner", policies: "Detection Policies", audit: "Audit Trail", system: "System & Model Info" };

  if (page === "home") return (
    <>
      <style>{STYLES}</style>
      <HomePage onLogin={handleAuthNav} />
    </>
  );

  if (page === "auth") return (
    <>
      <style>{STYLES}</style>
      <LoginPage onLogin={handleLogin} initMode={authMode} />
    </>
  );

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">
              <div className="logo-icon"><Icon d={Icons.shield} size={20} color="#ffffff" strokeWidth={2} /></div>
              <div>
                <div className="logo-text">DLP SCANNER</div>
                <div className="logo-sub">AI-Powered DLP</div>
              </div>
            </div>
          </div>
          <nav className="nav">
            {navItems.map(item => (
              <div key={item.id} className={`nav-item ${activePage === item.id ? "active" : ""}`}
                onClick={() => setActivePage(item.id)}>
                <Icon d={item.icon} size={16} />
                {item.label}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="user-badge">
              <div className="user-avatar">{user?.full_name?.[0] || "U"}</div>
              <div>
                <div className="user-name">{user?.full_name}</div>
                <div className="user-role">{user?.role?.toUpperCase()}</div>
              </div>
            </div>
            <div className="nav-item" onClick={handleLogout}>
              <Icon d={Icons.logout} size={16} />
              Sign Out
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="page-title">{pageTitle[activePage]}</div>
            <div className="topbar-right">
              <div className="flex items-center gap-2">
                <span className="status-dot green" />
                <span className="text-muted text-sm">System Online</span>
              </div>
              <span className="badge badge-success mono">MODEL: DISTILBERT</span>
            </div>
          </div>
          <div className="content">
            {activePage === "dashboard" && <Dashboard user={user} />}
            {activePage === "scanner" && <ScannerPage />}
            {activePage === "policies" && <PoliciesPage user={user} />}
            {activePage === "audit" && <AuditPage />}
            {activePage === "system" && <SystemPage user={user} />}
          </div>
        </main>
      </div>
    </>
  );
}
