import { useState, useRef, useEffect, useCallback } from "react";

// ─── KNOWLEDGE BASE ───────────────────────────────────────────────────────────

const KNOWLEDGE = `
Use this knowledge base when answering questions:

--- UNFAIR DISMISSAL ---
An unfair dismissal claim is a claim that your dismissal was harsh, unjust or unreasonable. You have been dismissed if: your employment was terminated at the initiative of your employer; you resigned because you were forced to by conduct of your employer (constructive dismissal); or you were on a fixed-term contract terminated before the end date. You have NOT been dismissed if the contract ended naturally or a training arrangement ended.
To be eligible, you must: have completed the minimum employment period (1 year for small business with <15 employees; 6 months for other employers); be covered by the national workplace relations system; and earn under the high income threshold (unless covered by an award or enterprise agreement).
You have 21 days from the date dismissal took effect to file a claim at the Fair Work Commission (FWC).

--- CASUAL EMPLOYMENT ---
Casual work means there is no firm advance commitment to ongoing work. Casual employees: receive a casual loading (usually 25%) in lieu of leave entitlements; are NOT entitled to paid annual leave or paid personal/carer's leave; ARE entitled to unpaid carer's leave, community service leave, compassionate leave; have the right to request conversion to permanent after 12 months of regular work.

--- GETTING PAID & UNDERPAYMENTS ---
All employees are entitled to a minimum rate of pay. Employers must provide payslips within 1 working day of pay. Payslips must include employer name and ABN, employee name, period of payment, gross and net pay, deductions, superannuation. Underpayments can be reported to the Fair Work Ombudsman. Wage theft is a criminal offence in some states.

--- WORKPLACE BULLYING ---
Workplace bullying is repeated, unreasonable behaviour directed at a worker creating a risk to health and safety. A single incident does not constitute bullying. Reasonable management action is NOT bullying. Workers can apply to the Fair Work Commission for an order to stop bullying.

--- NOTICE OF TERMINATION ---
NES minimum notice: less than 1 year = 1 week; 1–3 years = 2 weeks; 3–5 years = 3 weeks; over 5 years = 4 weeks. Over 45 years old with 2+ years service = extra 1 week. Serious misconduct can result in summary dismissal with no notice.

--- REDUNDANCY ---
Genuine redundancy: employer no longer requires the job to be done. NES redundancy pay: 1–2 years = 4 weeks; 2–3 years = 6 weeks; 3–4 years = 7 weeks; 4–5 years = 8 weeks; 5–6 years = 10 weeks; 6–7 years = 11 weeks; 7–8 years = 13 weeks; 8–9 years = 14 weeks; 9–10 years = 16 weeks; 10+ years = 12 weeks. Small business (under 15 employees) exempt.

--- DISCRIMINATION ---
Protected attributes include: race, sex, pregnancy, age, disability, carer status, sexual orientation, gender identity, criminal record. Complaints to Australian Human Rights Commission (federal) or Victorian EOHRCC (state). Time limits generally 12 months.

--- SEXUAL HARASSMENT ---
Unlawful under Sex Discrimination Act 1984 and Equal Opportunity Act 2010 (Vic). Employers have a positive duty to prevent it. Apply to Fair Work Commission for a stop sexual harassment order.

--- SUPERANNUATION ---
Employers must pay Superannuation Guarantee (11.5%, rising to 12% by July 2025) on ordinary time earnings. Must be paid quarterly. Report unpaid super to the ATO.

--- PARENTAL LEAVE ---
Employees with 12 months continuous service entitled to 12 months unpaid parental leave. Government Paid Parental Leave scheme available. Notify employer at least 10 weeks before leave.

--- FAMILY & DOMESTIC VIOLENCE LEAVE ---
All employees including casuals entitled to 10 days paid family and domestic violence leave per year since 2023.

--- EMPLOYMENT CONTRACTS ---
Cannot undercut NES or Modern Award minimums. Employer cannot unilaterally change contract terms. Variations must be agreed in writing.
`;

const SYSTEM_PROMPT = `You are Unfired, an expert Australian employment law assistant. You help both employees and employers understand their rights and obligations.

${KNOWLEDGE}

INSTRUCTIONS:
- Use the knowledge base above as your primary source
- Give practical, clear advice in plain English
- Cite relevant law (Fair Work Act 2009, NES, specific award)
- Tell users when to contact Fair Work Commission, Fair Work Ombudsman, ATO, or a lawyer
- Keep responses focused and concise
- Always end with a "Next Step:" section with 1-2 concrete actions
- You are an AI guide, not a lawyer`;

const LETTER_PROMPT = `You are an Australian employment law document specialist. Generate professional workplace letter templates.
- Use formal Australian business letter format
- Include [DATE], [YOUR NAME], [EMPLOYER NAME] placeholders
- Reference relevant Fair Work Act sections or NES entitlements
- Be assertive but professional
- End with a note to keep a copy of this letter and note when/how it was delivered.`;

const AWARD_PROMPT = `You are an Australian Modern Award specialist.
- Name the most likely Modern Award for the industry/role
- List minimum rate, casual loading, key penalty rates, overtime rules
- Mention the Fair Work Ombudsman Pay Calculator for exact figures
- Note if an Enterprise Agreement might apply`;

// ─── DATA ─────────────────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  { q: "Can my employer cut my hours?", icon: "clock" },
  { q: "What's my redundancy payout?", icon: "calculator" },
  { q: "Casual overtime rights?", icon: "briefcase" },
  { q: "Can I be fired without reason?", icon: "alert" },
  { q: "Minimum notice period?", icon: "calendar" },
  { q: "I haven't been paid!", icon: "dollar" },
];

const LETTER_TYPES = [
  { id: "underpayment",     label: "Underpayment Claim",    color: "#f59e0b", bg: "#fffbeb", desc: "Recover wages owed" },
  { id: "unfair_dismissal", label: "Unfair Dismissal",      color: "#ef4444", bg: "#fef2f2", desc: "Challenge termination" },
  { id: "resignation",      label: "Resignation Letter",    color: "#6366f1", bg: "#eef2ff", desc: "Formal notice" },
  { id: "flexible_work",    label: "Flexible Work",         color: "#10b981", bg: "#ecfdf5", desc: "Request changes" },
  { id: "harassment",       label: "Harassment Complaint",  color: "#ec4899", bg: "#fdf2f8", desc: "Report misconduct" },
  { id: "redundancy",       label: "Redundancy Dispute",    color: "#8b5cf6", bg: "#f5f3ff", desc: "Challenge redundancy" },
];

const AWARD_INDUSTRIES = [
  { name: "Retail Trade", icon: "shopping-bag" },
  { name: "Hospitality", icon: "coffee" },
  { name: "Construction", icon: "hard-hat" },
  { name: "Healthcare", icon: "heart" },
  { name: "Education", icon: "book-open" },
  { name: "Manufacturing", icon: "settings" },
  { name: "Transport", icon: "truck" },
  { name: "Professional Services", icon: "briefcase" },
  { name: "Agriculture", icon: "sun" },
  { name: "IT & Tech", icon: "monitor" },
  { name: "Hair & Beauty", icon: "scissors" },
  { name: "Security", icon: "shield" },
];

const RESOURCES = [
  { name: "Fair Work Ombudsman",    url: "https://www.fairwork.gov.au",          desc: "Pay calculator & entitlements", icon: "landmark", tag: "Official", color: "#2563eb"  },
  { name: "Fair Work Commission",   url: "https://www.fwc.gov.au",               desc: "Disputes & unfair dismissal",  icon: "scale",    tag: "Official", color: "#7c3aed"  },
  { name: "Safe Work Australia",    url: "https://www.safeworkaustralia.gov.au", desc: "WHS laws & workplace safety",  icon: "hard-hat", tag: "Official", color: "#059669"  },
  { name: "Working Women's Centre", url: "https://wwcsa.org.au",                desc: "Free advice for women workers", icon: "users",    tag: "Free",    color: "#db2777"  },
  { name: "ACTU - Unions",          url: "https://www.actu.org.au",              desc: "Find your union",               icon: "hand",     tag: "Support", color: "#ea580c"  },
];

// ─── SVG ICON COMPONENT ──────────────────────────────────────────────────────

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.8 }) {
  const s = { width: size, height: size, flexShrink: 0 };
  const p = { stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  const paths = {
    "send":         <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" {...p} />,
    "loader":       <><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" {...p} /></>,
    "message":      <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" {...p} /></>,
    "dollar":       <><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" {...p} /></>,
    "file-text":    <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" {...p} /><polyline points="14 2 14 8 20 8" {...p} /><line x1="16" y1="13" x2="8" y2="13" {...p} /><line x1="16" y1="17" x2="8" y2="17" {...p} /></>,
    "link":         <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" {...p} /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" {...p} /></>,
    "clock":        <><circle cx="12" cy="12" r="10" {...p} /><polyline points="12 6 12 12 16 14" {...p} /></>,
    "calculator":   <><rect x="4" y="2" width="16" height="20" rx="2" {...p} /><line x1="8" y1="6" x2="16" y2="6" {...p} /><line x1="8" y1="10" x2="8" y2="10.01" {...p} /><line x1="12" y1="10" x2="12" y2="10.01" {...p} /><line x1="16" y1="10" x2="16" y2="10.01" {...p} /><line x1="8" y1="14" x2="8" y2="14.01" {...p} /><line x1="12" y1="14" x2="12" y2="14.01" {...p} /><line x1="16" y1="14" x2="16" y2="14.01" {...p} /><line x1="8" y1="18" x2="16" y2="18" {...p} /></>,
    "briefcase":    <><rect x="2" y="7" width="20" height="14" rx="2" ry="2" {...p} /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" {...p} /></>,
    "alert":        <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" {...p} /><line x1="12" y1="9" x2="12" y2="13" {...p} /><line x1="12" y1="17" x2="12.01" y2="17" {...p} /></>,
    "calendar":     <><rect x="3" y="4" width="18" height="18" rx="2" ry="2" {...p} /><line x1="16" y1="2" x2="16" y2="6" {...p} /><line x1="8" y1="2" x2="8" y2="6" {...p} /><line x1="3" y1="10" x2="21" y2="10" {...p} /></>,
    "copy":         <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" {...p} /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" {...p} /></>,
    "check":        <polyline points="20 6 9 17 4 12" {...p} />,
    "shopping-bag": <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" {...p} /><line x1="3" y1="6" x2="21" y2="6" {...p} /><path d="M16 10a4 4 0 01-8 0" {...p} /></>,
    "coffee":       <><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" {...p} /><line x1="6" y1="1" x2="6" y2="4" {...p} /><line x1="10" y1="1" x2="10" y2="4" {...p} /><line x1="14" y1="1" x2="14" y2="4" {...p} /></>,
    "hard-hat":     <><path d="M2 18v-1a10 10 0 0120 0v1" {...p} /><path d="M2 18h20" {...p} /><path d="M12 2a7 7 0 017 7v2H5V9a7 7 0 017-7z" {...p} /></>,
    "heart":        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" {...p} />,
    "book-open":    <><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" {...p} /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" {...p} /></>,
    "settings":     <><circle cx="12" cy="12" r="3" {...p} /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" {...p} /></>,
    "truck":        <><rect x="1" y="3" width="15" height="13" {...p} /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" {...p} /><circle cx="5.5" cy="18.5" r="2.5" {...p} /><circle cx="18.5" cy="18.5" r="2.5" {...p} /></>,
    "sun":          <><circle cx="12" cy="12" r="5" {...p} /><line x1="12" y1="1" x2="12" y2="3" {...p} /><line x1="12" y1="21" x2="12" y2="23" {...p} /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" {...p} /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" {...p} /><line x1="1" y1="12" x2="3" y2="12" {...p} /><line x1="21" y1="12" x2="23" y2="12" {...p} /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" {...p} /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" {...p} /></>,
    "monitor":      <><rect x="2" y="3" width="20" height="14" rx="2" ry="2" {...p} /><line x1="8" y1="21" x2="16" y2="21" {...p} /><line x1="12" y1="17" x2="12" y2="21" {...p} /></>,
    "scissors":     <><circle cx="6" cy="6" r="3" {...p} /><circle cx="6" cy="18" r="3" {...p} /><line x1="20" y1="4" x2="8.12" y2="15.88" {...p} /><line x1="14.47" y1="14.48" x2="20" y2="20" {...p} /><line x1="8.12" y1="8.12" x2="12" y2="12" {...p} /></>,
    "shield":       <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p} />,
    "landmark":     <><polyline points="3 22 3 10" {...p} /><polyline points="9 22 9 10" {...p} /><polyline points="15 22 15 10" {...p} /><polyline points="21 22 21 10" {...p} /><polygon points="12 2 2 7 22 7 12 2" {...p} /><line x1="1" y1="22" x2="23" y2="22" {...p} /></>,
    "scale":        <><path d="M16 3l-4 4-4-4" {...p} /><path d="M12 7v14" {...p} /><path d="M5 21h14" {...p} /><path d="M2 11l4 4 4-4" {...p} /><path d="M14 11l4 4 4-4" {...p} /></>,
    "users":        <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" {...p} /><circle cx="9" cy="7" r="4" {...p} /><path d="M23 21v-2a4 4 0 00-3-3.87" {...p} /><path d="M16 3.13a4 4 0 010 7.75" {...p} /></>,
    "hand":         <><path d="M18 11V6a2 2 0 00-4 0M14 10V4a2 2 0 00-4 0M10 9.5V5a2 2 0 00-4 0v9" {...p} /><path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-3.78-.86-5.64-2.64L3.93 16.93a2 2 0 012.83-2.83L10 17.5" {...p} /></>,
    "arrow-right":  <><line x1="5" y1="12" x2="19" y2="12" {...p} /><polyline points="12 5 19 12 12 19" {...p} /></>,
    "external":     <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" {...p} /><polyline points="15 3 21 3 21 9" {...p} /><line x1="10" y1="14" x2="21" y2="3" {...p} /></>,
    "info":         <><circle cx="12" cy="12" r="10" {...p} /><line x1="12" y1="16" x2="12" y2="12" {...p} /><line x1="12" y1="8" x2="12.01" y2="8" {...p} /></>,
    "alert-tri":    <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" {...p} /><line x1="12" y1="9" x2="12" y2="13" {...p} /><line x1="12" y1="17" x2="12.01" y2="17" {...p} /></>,
    "sparkles":     <><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" {...p} /></>,
  };
  return <svg viewBox="0 0 24 24" style={s}>{paths[name] || paths["info"]}</svg>;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :root {
    --bg:        #0a0a0f;
    --surface:   #13131a;
    --surface2:  #1a1a24;
    --surface3:  #22222e;
    --accent:    #6366f1;
    --accent-2:  #818cf8;
    --accent-bg: rgba(99,102,241,0.08);
    --accent-border: rgba(99,102,241,0.2);
    --teal:      #2dd4bf;
    --teal-bg:   rgba(45,212,191,0.08);
    --teal-border: rgba(45,212,191,0.2);
    --amber:     #fbbf24;
    --rose:      #fb7185;
    --text:      #f1f1f4;
    --text-2:    #a1a1b5;
    --text-3:    #5a5a72;
    --border:    rgba(255,255,255,0.06);
    --border-2:  rgba(255,255,255,0.1);
    --glow:      0 0 40px rgba(99,102,241,0.15);
    --shadow:    0 8px 32px rgba(0,0,0,0.4);
    --shadow-lg: 0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(99,102,241,0.08);
    --radius:    16px;
    --radius-sm: 12px;
    --radius-xs: 8px;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 3px; }

  input, textarea, button, select { font-family: 'Inter', sans-serif; }
  input::placeholder, textarea::placeholder { color: var(--text-3); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes breathe {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50%      { opacity: 1; transform: scale(1); }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.1); }
    50%      { box-shadow: 0 0 40px rgba(99,102,241,0.25); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes gradient-shift {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }

  /* ── SHELL ── */
  .shell {
    width: 100%; max-width: 480px; height: 92vh; max-height: 860px;
    background: var(--surface);
    border-radius: 24px; overflow: hidden;
    box-shadow: var(--shadow-lg);
    display: flex; flex-direction: column;
    animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both;
    border: 1px solid var(--border-2);
    position: relative;
  }
  .shell::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 200px;
    background: linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%);
    pointer-events: none; z-index: 0;
  }

  /* ── HEADER ── */
  .header {
    padding: 16px 18px 14px;
    background: transparent;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    position: relative;
    z-index: 2;
  }
  .header-row { display: flex; align-items: center; gap: 12px; }

  .logo {
    width: 42px; height: 42px; border-radius: 14px; flex-shrink: 0;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15);
    position: relative;
    animation: glow-pulse 4s ease-in-out infinite;
  }
  .logo svg { filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3)); }

  .app-name {
    font-size: 19px; font-weight: 800;
    color: var(--text); letter-spacing: -0.4px; line-height: 1;
    background: linear-gradient(135deg, #f1f1f4 0%, #c7c7d4 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .app-sub {
    font-size: 11px; color: var(--text-3); margin-top: 3px;
    font-weight: 500; letter-spacing: 0.1px;
  }
  .status-dot {
    margin-left: auto;
    display: flex; align-items: center; gap: 6px;
    font-size: 10px; font-weight: 600;
    color: var(--teal); letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .status-dot::before {
    content: '';
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--teal);
    box-shadow: 0 0 8px rgba(45,212,191,0.5);
    animation: breathe 2s ease-in-out infinite;
  }

  /* ── TABS ── */
  .tabs {
    display: flex;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 4px 6px;
    gap: 2px;
    flex-shrink: 0;
    position: relative;
    z-index: 2;
  }
  .tab {
    flex: 1; padding: 10px 4px 8px; border: none;
    background: transparent; border-radius: var(--radius-xs);
    color: var(--text-3); cursor: pointer;
    font-size: 10px; font-weight: 600; letter-spacing: 0.3px;
    text-transform: uppercase; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    position: relative;
  }
  .tab .ti {
    width: 34px; height: 34px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
  }
  .tab.on .ti {
    background: var(--accent-bg);
    box-shadow: 0 0 0 1px var(--accent-border), 0 4px 12px rgba(99,102,241,0.15);
  }
  .tab.on .ti svg { color: var(--accent-2); }
  .tab.on { color: var(--accent-2); }
  .tab:not(.on):hover { color: var(--text-2); }
  .tab:not(.on):hover .ti { background: rgba(255,255,255,0.03); }
  .tab.on::after {
    content: '';
    position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
    width: 20px; height: 2px; border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(99,102,241,0.5);
  }

  /* ── CONTENT ── */
  .content { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; z-index: 1; }

  /* ── CHAT ── */
  .chips {
    padding: 14px 16px 6px;
    display: flex; flex-wrap: wrap; gap: 6px; flex-shrink: 0;
  }
  .chip {
    background: var(--surface2); border: 1px solid var(--border-2);
    color: var(--text-2); border-radius: 20px;
    padding: 6px 14px; font-size: 11.5px; font-weight: 500;
    cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
    white-space: nowrap;
    display: flex; align-items: center; gap: 5px;
  }
  .chip svg { opacity: 0.5; transition: opacity 0.2s; }
  .chip:hover {
    background: var(--accent-bg); color: var(--accent-2);
    border-color: var(--accent-border);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99,102,241,0.15);
  }
  .chip:hover svg { opacity: 1; color: var(--accent-2); }
  .chip:active { transform: translateY(0); }

  .msgs {
    flex: 1; overflow-y: auto; padding: 14px 16px;
    display: flex; flex-direction: column; gap: 14px;
  }

  .mrow { display: flex; animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both; }
  .mrow.u { justify-content: flex-end; }

  .av {
    width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    margin-right: 10px; margin-top: 2px;
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }

  .bub {
    max-width: 80%; padding: 12px 15px;
    font-size: 13.5px; line-height: 1.7; white-space: pre-wrap;
    font-weight: 400;
  }
  .bub.ai {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 4px 18px 18px 18px; color: var(--text);
  }
  .bub.usr {
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 18px 4px 18px 18px; color: white; font-weight: 500;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
  }

  .typing-wrap {
    display: flex; align-items: center; gap: 6px; padding: 8px 4px;
  }
  .dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--accent-2);
    animation: breathe 1.4s ease-in-out infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }

  .input-row {
    padding: 12px 14px; border-top: 1px solid var(--border);
    display: flex; gap: 8px; align-items: flex-end;
    background: var(--surface); flex-shrink: 0;
    position: relative; z-index: 2;
  }
  .cinput {
    flex: 1; background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: 22px; padding: 11px 18px;
    color: var(--text); font-size: 13.5px; outline: none;
    resize: none; line-height: 1.5; max-height: 100px;
    transition: border-color 0.25s, box-shadow 0.25s;
    font-weight: 400;
  }
  .cinput:focus {
    border-color: var(--accent-border);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }
  .sbtn {
    width: 42px; height: 42px; border-radius: 14px; border: none;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1); flex-shrink: 0;
  }
  .sbtn.on {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    box-shadow: 0 4px 16px rgba(99,102,241,0.4); color: white;
  }
  .sbtn.on:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(99,102,241,0.5); }
  .sbtn.on:active { transform: scale(0.95); }
  .sbtn.off { background: var(--surface3); color: var(--text-3); cursor: default; }
  .sbtn.loading {
    background: var(--surface3); color: var(--accent-2); cursor: default;
  }
  .sbtn.loading svg { animation: spin 1s linear infinite; }

  /* ── PANEL ── */
  .panel { flex: 1; overflow-y: auto; padding: 18px 16px; display: flex; flex-direction: column; gap: 16px; }

  .slabel {
    font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--text-3); margin-bottom: 8px;
  }

  .info-card {
    background: var(--accent-bg); border: 1px solid var(--accent-border);
    border-radius: var(--radius); padding: 16px;
    position: relative; overflow: hidden;
  }
  .info-card::before {
    content: '';
    position: absolute; top: -20px; right: -20px;
    width: 80px; height: 80px; border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%);
  }
  .ic-title { color: var(--accent-2); font-size: 13px; font-weight: 700; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; }
  .ic-body  { color: var(--text-2); font-size: 12.5px; line-height: 1.65; }

  .ind-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .ichip {
    background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius-xs); padding: 10px 8px; font-size: 11px;
    color: var(--text-2); cursor: pointer; transition: all 0.2s cubic-bezier(0.16,1,0.3,1);
    font-weight: 500; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
  }
  .ichip svg { opacity: 0.4; transition: all 0.2s; }
  .ichip:hover { border-color: var(--accent-border); color: var(--accent-2); background: var(--accent-bg); }
  .ichip:hover svg { opacity: 0.8; color: var(--accent-2); }
  .ichip.sel {
    background: var(--accent-bg); border-color: var(--accent);
    color: var(--accent-2);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 4px 12px rgba(99,102,241,0.2);
  }
  .ichip.sel svg { opacity: 1; color: var(--accent-2); }

  .tinput {
    width: 100%; background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius-xs); padding: 12px 16px;
    color: var(--text); font-size: 13.5px; outline: none;
    transition: all 0.25s; font-weight: 400;
  }
  .tinput:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

  .tarea {
    width: 100%; background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius-xs); padding: 12px 16px;
    color: var(--text); font-size: 13px; outline: none;
    resize: none; line-height: 1.65; transition: all 0.25s; font-weight: 400;
  }
  .tarea:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }

  .pbtn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none; border-radius: var(--radius-xs);
    color: white; font-weight: 700; font-size: 13.5px;
    cursor: pointer; letter-spacing: 0.2px;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
    font-family: 'Inter', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .pbtn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(99,102,241,0.45);
  }
  .pbtn:active:not(:disabled) { transform: translateY(0); }
  .pbtn:disabled { opacity: 0.35; cursor: default; transform: none; box-shadow: none; }
  .pbtn.loading-btn {
    background: var(--surface3); color: var(--text-2);
    box-shadow: none;
  }
  .pbtn.loading-btn svg { animation: spin 1s linear infinite; }

  .rbox {
    background: var(--surface2); border: 1px solid var(--border-2);
    border-radius: var(--radius); padding: 18px;
    font-size: 13px; line-height: 1.8; color: var(--text);
    white-space: pre-wrap; animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
    font-weight: 400;
    position: relative;
  }
  .rbox::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-border), transparent);
  }

  .cpybtn {
    display: inline-flex; align-items: center; gap: 6px; margin-top: 14px;
    background: var(--surface3); border: 1px solid var(--border-2);
    border-radius: var(--radius-xs); padding: 8px 14px;
    color: var(--text-2); font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .cpybtn:hover { background: var(--accent-bg); color: var(--accent-2); border-color: var(--accent-border); }
  .cpybtn.copied { background: rgba(45,212,191,0.1); color: var(--teal); border-color: var(--teal-border); }

  /* ── LETTER GRID ── */
  .lgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .lcard {
    background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius); padding: 16px 14px;
    cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1); text-align: left;
    position: relative; overflow: hidden;
  }
  .lcard::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--lcard-color, var(--accent));
    opacity: 0; transition: opacity 0.25s;
  }
  .lcard:hover { border-color: var(--border-2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .lcard:hover::before { opacity: 1; }
  .lcard.sel {
    border-color: var(--accent-border);
    background: var(--accent-bg);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }
  .lcard.sel::before { opacity: 1; }
  .lci {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px; transition: all 0.25s;
  }
  .lcl { font-size: 12.5px; font-weight: 700; color: var(--text); line-height: 1.3; margin-bottom: 3px; }
  .lcard.sel .lcl { color: var(--accent-2); }
  .lcd { font-size: 11px; color: var(--text-3); font-weight: 500; }

  /* ── RESOURCES ── */
  .rcard {
    display: flex; align-items: center; gap: 14px; padding: 14px 16px;
    background: var(--surface2); border: 1px solid var(--border-2);
    border-radius: var(--radius); text-decoration: none;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    position: relative; overflow: hidden;
  }
  .rcard::before {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: var(--rcard-color, var(--accent));
    opacity: 0; transition: opacity 0.25s;
  }
  .rcard:hover {
    border-color: var(--border-2); background: var(--surface3);
    transform: translateX(4px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .rcard:hover::before { opacity: 1; }
  .ricon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .rname { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; display: flex; align-items: center; gap: 8px; }
  .rcard:hover .rname { color: var(--text); }
  .rdesc { font-size: 11.5px; color: var(--text-3); font-weight: 500; }
  .rtag {
    font-size: 9px; font-weight: 700; letter-spacing: 0.4px;
    padding: 2px 7px; border-radius: 6px;
    background: var(--accent-bg); color: var(--accent-2);
    border: 1px solid var(--accent-border); text-transform: uppercase;
  }
  .rarr {
    margin-left: auto; color: var(--text-3); flex-shrink: 0;
    transition: all 0.25s; opacity: 0.5;
  }
  .rcard:hover .rarr { transform: translate(2px, -2px); opacity: 1; color: var(--accent-2); }

  .disclaimer {
    background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.15);
    border-radius: var(--radius-sm); padding: 14px 16px;
    font-size: 11.5px; line-height: 1.65; color: var(--amber);
    display: flex; gap: 10px; align-items: flex-start;
  }
  .disclaimer svg { flex-shrink: 0; margin-top: 1px; }
  .disclaimer strong { font-weight: 700; }

  /* ── WELCOME ── */
  .welcome {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 24px 20px 16px; gap: 4px;
  }
  .welcome-icon {
    width: 48px; height: 48px; border-radius: 16px;
    background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15));
    border: 1px solid var(--accent-border);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 10px;
    animation: float 3s ease-in-out infinite;
  }
  .welcome h3 {
    font-size: 16px; font-weight: 700; color: var(--text);
    margin-bottom: 4px;
  }
  .welcome p {
    font-size: 12.5px; color: var(--text-3); line-height: 1.5;
    max-width: 300px;
  }

  /* ── EMPTY STATE ── */
  .empty-state {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 20px; text-align: center; gap: 8px;
    color: var(--text-3);
  }
  .empty-state svg { opacity: 0.3; margin-bottom: 8px; }
  .empty-state p { font-size: 13px; }
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function callClaude(system, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Sorry, no response received.";
}

// ─── CHAT TAB ─────────────────────────────────────────────────────────────────

function ChatTab() {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const next = [...msgs, { role: "user", content: msg }];
    setMsgs(next);
    setLoading(true);
    try {
      const history = next.map(m => ({ role: m.role, content: m.content }));
      const reply = await callClaude(SYSTEM_PROMPT, history);
      setMsgs(p => [...p, { role: "assistant", content: reply }]);
    } catch {
      setMsgs(p => [...p, { role: "assistant", content: "Something went wrong. Please try again." }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }, [input, msgs, loading]);

  const showWelcome = msgs.length === 0 && !loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {showWelcome && (
        <div className="welcome" style={{ animation: "fadeIn 0.5s ease" }}>
          <div className="welcome-icon">
            <Icon name="sparkles" size={24} color="#818cf8" />
          </div>
          <h3>How can I help?</h3>
          <p>Ask me anything about Australian workplace rights, entitlements, or employment law.</p>
        </div>
      )}
      <div className="chips" style={showWelcome ? {} : { paddingTop: 14 }}>
        {QUICK_QUESTIONS.map(({ q, icon }) => (
          <button key={q} className="chip" onClick={() => send(q)}>
            <Icon name={icon} size={13} />
            {q}
          </button>
        ))}
      </div>
      <div className="msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`mrow ${m.role === "user" ? "u" : ""}`}
            style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
            {m.role === "assistant" && (
              <div className="av">
                <Icon name="scale" size={16} color="white" />
              </div>
            )}
            <div className={`bub ${m.role === "assistant" ? "ai" : "usr"}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mrow" style={{ animation: "slideUp 0.3s ease both" }}>
            <div className="av">
              <Icon name="scale" size={16} color="white" />
            </div>
            <div className="bub ai">
              <div className="typing-wrap">
                <div className="dot" /><div className="dot" /><div className="dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="input-row">
        <textarea ref={inputRef} className="cinput" rows={1} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask about your workplace rights..." />
        <button
          className={`sbtn ${loading ? "loading" : input.trim() ? "on" : "off"}`}
          onClick={() => send()} disabled={!input.trim() || loading}>
          {loading
            ? <Icon name="loader" size={18} color="#818cf8" />
            : <Icon name="send" size={18} color={input.trim() ? "white" : "#5a5a72"} />
          }
        </button>
      </div>
    </div>
  );
}

// ─── AWARD TAB ────────────────────────────────────────────────────────────────

function AwardTab() {
  const [industry, setIndustry] = useState("");
  const [role, setRole] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function lookup() {
    setLoading(true); setResult("");
    try {
      const reply = await callClaude(AWARD_PROMPT, [{
        role: "user",
        content: `Industry: ${industry || "unknown"}. Role: ${role || "unknown"}. What Modern Award covers this person and what are their key minimum entitlements?`
      }]);
      setResult(reply);
    } catch { setResult("Something went wrong. Please try again."); }
    setLoading(false);
  }

  return (
    <div className="panel">
      <div className="info-card">
        <div className="ic-title">
          <Icon name="info" size={16} color="#818cf8" />
          What's a Modern Award?
        </div>
        <div className="ic-body">Modern Awards set minimum pay rates, penalty rates, and entitlements for specific industries. Over 120 awards cover most Australian workers.</div>
      </div>
      <div>
        <div className="slabel">Select your industry</div>
        <div className="ind-grid">
          {AWARD_INDUSTRIES.map(ind => (
            <button key={ind.name} className={`ichip ${industry === ind.name ? "sel" : ""}`}
              onClick={() => setIndustry(ind.name)}>
              <Icon name={ind.icon} size={18} />
              <span>{ind.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="slabel">Your job title or role</div>
        <input className="tinput" value={role} onChange={e => setRole(e.target.value)}
          placeholder="e.g. Barista, Registered Nurse, Site Supervisor..." />
      </div>
      <button className={`pbtn ${loading ? "loading-btn" : ""}`} onClick={lookup} disabled={loading || (!industry && !role)}>
        {loading
          ? <><Icon name="loader" size={16} /> Looking up your award...</>
          : <>Find My Award & Entitlements <Icon name="arrow-right" size={16} /></>
        }
      </button>
      {result && <div className="rbox">{result}</div>}
    </div>
  );
}

// ─── LETTERS TAB ─────────────────────────────────────────────────────────────

function LettersTab() {
  const [selected, setSelected] = useState(null);
  const [context, setContext]   = useState("");
  const [result, setResult]     = useState("");
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState(false);

  async function generate() {
    setLoading(true); setResult("");
    try {
      const reply = await callClaude(LETTER_PROMPT, [{
        role: "user",
        content: `Generate a ${selected.label} template for an Australian workplace. Context: ${context || "none"}. Use [PLACEHOLDER] for personal details.`
      }]);
      setResult(reply);
    } catch { setResult("Something went wrong."); }
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel">
      <div>
        <div className="slabel">Choose a template type</div>
        <div className="lgrid">
          {LETTER_TYPES.map(lt => (
            <button key={lt.id}
              className={`lcard ${selected?.id === lt.id ? "sel" : ""}`}
              style={{ "--lcard-color": lt.color }}
              onClick={() => { setSelected(lt); setResult(""); }}>
              <div className="lci" style={{ background: lt.bg }}>
                <Icon name="file-text" size={18} color={lt.color} />
              </div>
              <div className="lcl">{lt.label}</div>
              <div className="lcd">{lt.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
          <div>
            <div className="slabel">Add context <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></div>
            <textarea className="tarea" rows={3} value={context}
              onChange={e => setContext(e.target.value)}
              placeholder='e.g. "I worked at a cafe for 3 years and was dismissed without warning..."' />
          </div>
          <button className={`pbtn ${loading ? "loading-btn" : ""}`} onClick={generate} disabled={loading}>
            {loading
              ? <><Icon name="loader" size={16} /> Generating...</>
              : <>Generate {selected.label} <Icon name="arrow-right" size={16} /></>
            }
          </button>
        </div>
      )}
      {result && (
        <div className="rbox">
          {result}
          <button className={`cpybtn ${copied ? "copied" : ""}`} onClick={copy}>
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── RESOURCES TAB ───────────────────────────────────────────────────────────

function ResourcesTab() {
  return (
    <div className="panel">
      <div className="slabel">Official & support organisations</div>
      {RESOURCES.map((r, i) => (
        <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" className="rcard"
          style={{ animationDelay: `${i * 0.06}s`, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both", "--rcard-color": r.color }}>
          <div className="ricon" style={{ background: `${r.color}15` }}>
            <Icon name={r.icon} size={20} color={r.color} />
          </div>
          <div>
            <div className="rname">{r.name}<span className="rtag">{r.tag}</span></div>
            <div className="rdesc">{r.desc}</div>
          </div>
          <div className="rarr">
            <Icon name="external" size={16} />
          </div>
        </a>
      ))}
      <div className="disclaimer">
        <Icon name="alert-tri" size={16} color="#fbbf24" strokeWidth={2} />
        <div>
          <strong>Disclaimer</strong> — Unfired provides general legal information only, not legal advice. For serious matters, consult a qualified employment lawyer or contact the Fair Work Ombudsman directly.
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "chat",      icon: "message",   label: "Ask AI"    },
  { id: "award",     icon: "dollar",    label: "My Award"  },
  { id: "letters",   icon: "file-text", label: "Templates" },
  { id: "resources", icon: "link",      label: "Resources" },
];

export default function App() {
  const [tab, setTab] = useState("chat");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      position: "relative", overflow: "hidden",
    }}>
      <style>{CSS}</style>

      {/* Ambient background glows */}
      <div style={{
        position: "fixed", top: "-10%", left: "-5%", width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)",
        pointerEvents: "none", filter: "blur(40px)",
      }} />
      <div style={{
        position: "fixed", bottom: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)",
        pointerEvents: "none", filter: "blur(40px)",
      }} />
      <div style={{
        position: "fixed", top: "40%", right: "20%", width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(45,212,191,0.03) 0%, transparent 60%)",
        pointerEvents: "none", filter: "blur(40px)",
      }} />

      <div className="shell">
        {/* Header */}
        <div className="header">
          <div className="header-row">
            <div className="logo">
              <Icon name="shield" size={22} color="white" strokeWidth={2} />
            </div>
            <div>
              <div className="app-name">Unfired</div>
              <div className="app-sub">Australian Workplace Rights</div>
            </div>
            <div className="status-dot">Online</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
              <span className="ti">
                <Icon name={t.icon} size={18} color={tab === t.id ? "#818cf8" : "#5a5a72"} />
              </span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="content">
          {tab === "chat"      && <ChatTab />}
          {tab === "award"     && <AwardTab />}
          {tab === "letters"   && <LettersTab />}
          {tab === "resources" && <ResourcesTab />}
        </div>
      </div>
    </div>
  );
}
