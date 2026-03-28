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
NES minimum notice: less than 1 year = 1 week; 1-3 years = 2 weeks; 3-5 years = 3 weeks; over 5 years = 4 weeks. Over 45 years old with 2+ years service = extra 1 week. Serious misconduct can result in summary dismissal with no notice.

--- REDUNDANCY ---
Genuine redundancy: employer no longer requires the job to be done. NES redundancy pay: 1-2 years = 4 weeks; 2-3 years = 6 weeks; 3-4 years = 7 weeks; 4-5 years = 8 weeks; 5-6 years = 10 weeks; 6-7 years = 11 weeks; 7-8 years = 13 weeks; 8-9 years = 14 weeks; 9-10 years = 16 weeks; 10+ years = 12 weeks. Small business (under 15 employees) exempt.

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
- List the ACTUAL current minimum hourly rate in AUD dollars
- List casual loading percentage and the casual hourly rate
- List key penalty rates (Saturday, Sunday, public holiday) as multipliers AND dollar amounts
- List overtime rates
- Mention the Fair Work Ombudsman Pay Calculator for exact figures
- Note if an Enterprise Agreement might apply`;

const TRIAGE_PROMPT = `You are an Australian employment law triage specialist. The user will describe a workplace situation. You must:
1. Classify what type of issue this is (choose from: Unfair Dismissal, General Protections/Adverse Action, Workplace Bullying, Sexual Harassment, Discrimination, Underpayment/Wage Theft, Redundancy Dispute, Contract Breach, WHS Violation, Other)
2. Rate urgency: URGENT (has a deadline soon), IMPORTANT (should act soon), or MONITOR (gather evidence first)
3. Name the exact body to complain to (Fair Work Commission, Fair Work Ombudsman, Australian Human Rights Commission, State EOHR Commission, SafeWork, ATO, or a lawyer)
4. Give the specific form/application number if applicable (e.g., Form F2 for unfair dismissal)
5. State any time limits that apply
6. List 3-5 immediate actions to take

Format your response with clear headings for each section. Be direct and practical.`;

const EVIDENCE_PROMPT = `You are an Australian employment law evidence specialist. The user will describe their workplace issue. Generate a comprehensive evidence checklist specific to their situation. For each item:
- Name the evidence type
- Explain WHY it matters for their specific claim
- Give practical tips on how to obtain/preserve it
- Note if it has an expiry or may be deleted

Group evidence into categories: Documents, Communications, Witnesses, Financial Records, Medical/Health, Photos/Video, Official Records.
End with "Priority Actions" - the 3 most time-sensitive evidence items to secure immediately.`;

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

const TOOLS_LIST = [
  { id: "payslip",     label: "Payslip Auditor",      desc: "Check if you're being underpaid",     icon: "search-dollar", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "eligibility", label: "Dismissal Checker",    desc: "Can you lodge an unfair dismissal claim?", icon: "check-circle", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  { id: "notice",      label: "Notice & Redundancy",  desc: "Calculate your exact entitlements",   icon: "calculator",    color: "#6366f1", bg: "rgba(99,102,241,0.1)" },
  { id: "triage",      label: "What Just Happened?",  desc: "Classify your situation & next steps", icon: "compass",      color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  { id: "deadline",    label: "Deadline Tracker",     desc: "Don't miss critical time limits",     icon: "clock",         color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  { id: "evidence",    label: "Evidence Checklist",   desc: "What to collect before it disappears", icon: "clipboard",    color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
];

// Penalty rate data for payslip auditor
const PENALTY_RATES = {
  "General Retail Industry Award": { base: 25.23, casual: 1.25, sat: 1.25, sun: 1.5, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "Hospitality Industry (General) Award": { base: 24.73, casual: 1.25, sat: 1.25, sun: 1.5, pubHol: 2.25, ot1: 1.5, ot2: 2.0 },
  "Building and Construction General On-site Award": { base: 29.16, casual: 1.25, sat: 1.5, sun: 2.0, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "Health Professionals and Support Services Award": { base: 26.68, casual: 1.25, sat: 1.25, sun: 1.5, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "Educational Services (Teachers) Award": { base: 29.86, casual: 1.25, sat: 1.5, sun: 2.0, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "Manufacturing and Associated Industries Award": { base: 25.72, casual: 1.25, sat: 1.5, sun: 2.0, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "Road Transport and Distribution Award": { base: 26.30, casual: 1.25, sat: 1.5, sun: 2.0, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "Professional Employees Award": { base: 27.42, casual: 1.25, sat: 1.5, sun: 2.0, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
  "National Minimum Wage": { base: 24.10, casual: 1.25, sat: 1.25, sun: 1.5, pubHol: 2.5, ot1: 1.5, ot2: 2.0 },
};

// Deadline data
const DEADLINE_TYPES = [
  { id: "unfair_dismissal", label: "Unfair Dismissal Claim", days: 21, body: "Fair Work Commission", form: "Form F2", desc: "From date dismissal took effect", color: "#ef4444" },
  { id: "general_protections", label: "General Protections (Dismissed)", days: 21, body: "Fair Work Commission", form: "Form F8", desc: "From date of dismissal", color: "#f59e0b" },
  { id: "bullying", label: "Bullying Stop Order", days: null, body: "Fair Work Commission", form: "Form F72", desc: "No strict time limit, but act promptly", color: "#8b5cf6" },
  { id: "discrimination_federal", label: "Discrimination (Federal)", days: 365, body: "Australian Human Rights Commission", form: "Online complaint", desc: "From date of discriminatory act", color: "#ec4899" },
  { id: "discrimination_vic", label: "Discrimination (Victoria)", days: 365, body: "Victorian EOHR Commission", form: "Online complaint", desc: "From date of discriminatory act", color: "#ec4899" },
  { id: "underpayment", label: "Underpayment Claim", days: 2190, body: "Fair Work Ombudsman or Federal Court", form: "FWO online complaint", desc: "6 years from when wages were due", color: "#f59e0b" },
  { id: "sexual_harassment", label: "Sexual Harassment (Stop Order)", days: null, body: "Fair Work Commission", form: "Form F75", desc: "No strict time limit for stop orders", color: "#ef4444" },
  { id: "unpaid_super", label: "Unpaid Superannuation", days: null, body: "Australian Taxation Office", form: "ATO online report", desc: "Report anytime, but act within financial year if possible", color: "#6366f1" },
  { id: "workers_comp", label: "Workers Compensation", days: 30, body: "State WorkCover authority", form: "Worker's injury claim form", desc: "30 days from injury (varies by state)", color: "#10b981" },
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
    "check-circle": <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" {...p} /><polyline points="22 4 12 14.01 9 11.01" {...p} /></>,
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
    "arrow-left":   <><line x1="19" y1="12" x2="5" y2="12" {...p} /><polyline points="12 19 5 12 12 5" {...p} /></>,
    "external":     <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" {...p} /><polyline points="15 3 21 3 21 9" {...p} /><line x1="10" y1="14" x2="21" y2="3" {...p} /></>,
    "info":         <><circle cx="12" cy="12" r="10" {...p} /><line x1="12" y1="16" x2="12" y2="12" {...p} /><line x1="12" y1="8" x2="12.01" y2="8" {...p} /></>,
    "alert-tri":    <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" {...p} /><line x1="12" y1="9" x2="12" y2="13" {...p} /><line x1="12" y1="17" x2="12.01" y2="17" {...p} /></>,
    "sparkles":     <><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" {...p} /></>,
    "search-dollar":<><circle cx="11" cy="11" r="8" {...p} /><line x1="21" y1="21" x2="16.65" y2="16.65" {...p} /><path d="M11 8v6M13 9.5h-2.5a1.5 1.5 0 000 3h1a1.5 1.5 0 010 3H9" {...p} /></>,
    "compass":      <><circle cx="12" cy="12" r="10" {...p} /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" {...p} /></>,
    "clipboard":    <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" {...p} /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" {...p} /></>,
    "grid":         <><rect x="3" y="3" width="7" height="7" {...p} /><rect x="14" y="3" width="7" height="7" {...p} /><rect x="14" y="14" width="7" height="7" {...p} /><rect x="3" y="14" width="7" height="7" {...p} /></>,
    "x":            <><line x1="18" y1="6" x2="6" y2="18" {...p} /><line x1="6" y1="6" x2="18" y2="18" {...p} /></>,
    "chevron-down": <polyline points="6 9 12 15 18 9" {...p} />,
    "minus":        <line x1="5" y1="12" x2="19" y2="12" {...p} />,
    "plus":         <><line x1="12" y1="5" x2="12" y2="19" {...p} /><line x1="5" y1="12" x2="19" y2="12" {...p} /></>,
    "target":       <><circle cx="12" cy="12" r="10" {...p} /><circle cx="12" cy="12" r="6" {...p} /><circle cx="12" cy="12" r="2" {...p} /></>,
    "zap":          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...p} />,
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
    --green:     #10b981;
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
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.1); }
    50%      { box-shadow: 0 0 40px rgba(99,102,241,0.25); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }
  @keyframes count-pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  @keyframes urgent-glow {
    0%, 100% { box-shadow: 0 0 8px rgba(239,68,68,0.2); }
    50%      { box-shadow: 0 0 20px rgba(239,68,68,0.4); }
  }

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
    animation: glow-pulse 4s ease-in-out infinite;
  }

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
    font-size: 9px; font-weight: 600; letter-spacing: 0.3px;
    text-transform: uppercase; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    position: relative;
  }
  .tab .ti {
    width: 32px; height: 32px; border-radius: 10px;
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

  .content { flex: 1; overflow: hidden; display: flex; flex-direction: column; position: relative; z-index: 1; }

  /* CHAT */
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
  .sbtn.loading { background: var(--surface3); color: var(--accent-2); cursor: default; }
  .sbtn.loading svg { animation: spin 1s linear infinite; }

  /* PANEL */
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
    background: var(--accent-bg); border-color: var(--accent); color: var(--accent-2);
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
  .pbtn.loading-btn { background: var(--surface3); color: var(--text-2); box-shadow: none; }
  .pbtn.loading-btn svg { animation: spin 1s linear infinite; }

  .rbox {
    background: var(--surface2); border: 1px solid var(--border-2);
    border-radius: var(--radius); padding: 18px;
    font-size: 13px; line-height: 1.8; color: var(--text);
    white-space: pre-wrap; animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
    font-weight: 400; position: relative;
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
    border-color: var(--accent-border); background: var(--accent-bg);
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
    transform: translateX(4px); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }
  .rcard:hover::before { opacity: 1; }
  .ricon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .rname { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 2px; display: flex; align-items: center; gap: 8px; }
  .rdesc { font-size: 11.5px; color: var(--text-3); font-weight: 500; }
  .rtag {
    font-size: 9px; font-weight: 700; letter-spacing: 0.4px;
    padding: 2px 7px; border-radius: 6px;
    background: var(--accent-bg); color: var(--accent-2);
    border: 1px solid var(--accent-border); text-transform: uppercase;
  }
  .rarr { margin-left: auto; color: var(--text-3); flex-shrink: 0; transition: all 0.25s; opacity: 0.5; }
  .rcard:hover .rarr { transform: translate(2px, -2px); opacity: 1; color: var(--accent-2); }

  .disclaimer {
    background: rgba(251,191,36,0.06); border: 1px solid rgba(251,191,36,0.15);
    border-radius: var(--radius-sm); padding: 14px 16px;
    font-size: 11.5px; line-height: 1.65; color: var(--amber);
    display: flex; gap: 10px; align-items: flex-start;
  }
  .disclaimer svg { flex-shrink: 0; margin-top: 1px; }

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
  .welcome h3 { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
  .welcome p { font-size: 12.5px; color: var(--text-3); line-height: 1.5; max-width: 300px; }

  /* TOOLS */
  .tools-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tool-card {
    background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius); padding: 18px 14px;
    cursor: pointer; transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    text-align: left; position: relative; overflow: hidden;
  }
  .tool-card::after {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--tool-color, var(--accent));
    opacity: 0; transition: opacity 0.25s;
  }
  .tool-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); border-color: var(--border-2); }
  .tool-card:hover::after { opacity: 1; }
  .tool-card:active { transform: translateY(0); }
  .tool-icon {
    width: 40px; height: 40px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
  }
  .tool-label { font-size: 13px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
  .tool-desc { font-size: 11px; color: var(--text-3); font-weight: 500; line-height: 1.4; }

  .back-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; color: var(--text-3);
    font-size: 12px; font-weight: 600; cursor: pointer;
    padding: 0; margin-bottom: 12px; transition: color 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .back-btn:hover { color: var(--accent-2); }

  /* FORM ELEMENTS */
  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-label {
    font-size: 12px; font-weight: 600; color: var(--text-2);
    display: flex; align-items: center; gap: 6px;
  }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-hint { font-size: 11px; color: var(--text-3); margin-top: 2px; }

  .select-wrap {
    position: relative;
  }
  .select-wrap select {
    width: 100%; background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius-xs); padding: 12px 36px 12px 16px;
    color: var(--text); font-size: 13.5px; outline: none;
    transition: all 0.25s; font-weight: 400;
    -webkit-appearance: none; -moz-appearance: none; appearance: none;
    cursor: pointer;
  }
  .select-wrap select:focus { border-color: var(--accent-border); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
  .select-wrap::after {
    content: '';
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    width: 0; height: 0;
    border-left: 5px solid transparent; border-right: 5px solid transparent;
    border-top: 5px solid var(--text-3);
    pointer-events: none;
  }
  .select-wrap select option { background: var(--surface2); color: var(--text); }

  /* RESULT CARDS */
  .result-card {
    background: var(--surface2); border: 1px solid var(--border-2);
    border-radius: var(--radius); overflow: hidden;
    animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1);
  }
  .result-header {
    padding: 14px 16px; display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border);
  }
  .result-header-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .result-header h4 { font-size: 14px; font-weight: 700; color: var(--text); }
  .result-header .tag {
    margin-left: auto; font-size: 10px; font-weight: 700;
    padding: 3px 10px; border-radius: 20px; text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .result-body { padding: 16px; }
  .result-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid var(--border);
  }
  .result-row:last-child { border-bottom: none; }
  .result-row .label { font-size: 12.5px; color: var(--text-2); font-weight: 500; }
  .result-row .value { font-size: 13.5px; color: var(--text); font-weight: 700; text-align: right; }
  .result-row .value.green { color: var(--green); }
  .result-row .value.red { color: #ef4444; }
  .result-row .value.amber { color: var(--amber); }

  .result-total {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 16px; background: var(--accent-bg);
    border-top: 1px solid var(--accent-border);
  }
  .result-total .label { font-size: 13px; font-weight: 700; color: var(--accent-2); }
  .result-total .value { font-size: 18px; font-weight: 800; color: var(--text); }

  /* WIZARD */
  .wizard-step {
    animation: slideUp 0.3s cubic-bezier(0.16,1,0.3,1);
  }
  .wizard-progress {
    display: flex; gap: 4px; margin-bottom: 18px;
  }
  .wizard-dot {
    flex: 1; height: 3px; border-radius: 3px;
    background: var(--border-2); transition: all 0.3s;
  }
  .wizard-dot.active { background: var(--accent); }
  .wizard-dot.done { background: var(--green); }

  .option-grid { display: flex; flex-direction: column; gap: 8px; }
  .option-btn {
    display: flex; align-items: center; gap: 12px;
    background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: var(--radius-sm); padding: 14px 16px;
    cursor: pointer; transition: all 0.2s; text-align: left;
    font-family: 'Inter', sans-serif;
  }
  .option-btn:hover { border-color: var(--accent-border); background: var(--accent-bg); }
  .option-btn.sel { border-color: var(--accent); background: var(--accent-bg); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .option-btn .opt-label { font-size: 13px; font-weight: 600; color: var(--text); }
  .option-btn .opt-desc { font-size: 11px; color: var(--text-3); margin-top: 2px; }
  .option-btn .opt-radio {
    width: 18px; height: 18px; border-radius: 50%;
    border: 2px solid var(--border-2); flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
  }
  .option-btn.sel .opt-radio { border-color: var(--accent); }
  .option-btn.sel .opt-radio::after {
    content: ''; width: 8px; height: 8px; border-radius: 50%;
    background: var(--accent);
  }

  /* DEADLINE */
  .deadline-card {
    background: var(--surface2); border: 1px solid var(--border-2);
    border-radius: var(--radius); padding: 16px;
    transition: all 0.2s; position: relative; overflow: hidden;
  }
  .deadline-card.urgent { border-color: rgba(239,68,68,0.3); animation: urgent-glow 2s ease-in-out infinite; }
  .deadline-card.warning { border-color: rgba(251,191,36,0.3); }
  .deadline-card .dl-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .deadline-card .dl-type { font-size: 13px; font-weight: 700; color: var(--text); }
  .deadline-card .dl-body { font-size: 11px; color: var(--text-3); margin-bottom: 10px; font-weight: 500; }
  .deadline-card .dl-countdown {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; border-radius: var(--radius-xs);
    background: var(--surface3);
  }
  .dl-countdown .num { font-size: 22px; font-weight: 800; animation: count-pulse 2s ease infinite; }
  .dl-countdown .unit { font-size: 11px; color: var(--text-3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .dl-countdown .sep { color: var(--text-3); font-size: 18px; font-weight: 300; }
  .dl-meta { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .dl-tag {
    font-size: 10px; font-weight: 600; padding: 3px 8px;
    border-radius: 6px; background: var(--accent-bg);
    color: var(--accent-2); border: 1px solid var(--accent-border);
  }

  /* CHECKLIST */
  .checklist-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .checklist-item:last-child { border-bottom: none; }
  .check-box {
    width: 20px; height: 20px; border-radius: 6px;
    border: 2px solid var(--border-2); flex-shrink: 0;
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: center;
    margin-top: 1px;
  }
  .check-box.checked { background: var(--green); border-color: var(--green); }
  .check-text { font-size: 13px; color: var(--text); line-height: 1.5; }
  .check-text.done { text-decoration: line-through; color: var(--text-3); }

  /* ─── LANDING PAGE ─── */
  .landing {
    min-height: 100vh; width: 100%;
    display: flex; flex-direction: column; align-items: center;
    background: var(--bg); position: relative; overflow: hidden;
  }
  .landing-bg-1 {
    position: absolute; top: -20%; left: -10%; width: 800px; height: 800px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 55%);
    filter: blur(80px); pointer-events: none; animation: landing-drift-1 20s ease-in-out infinite;
  }
  .landing-bg-2 {
    position: absolute; bottom: -25%; right: -15%; width: 700px; height: 700px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 55%);
    filter: blur(80px); pointer-events: none; animation: landing-drift-2 25s ease-in-out infinite;
  }
  .landing-bg-3 {
    position: absolute; top: 35%; left: 50%; width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(45,212,191,0.05) 0%, transparent 55%);
    filter: blur(60px); pointer-events: none; transform: translateX(-50%);
  }
  @keyframes landing-drift-1 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(40px, 30px); }
  }
  @keyframes landing-drift-2 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-30px, -40px); }
  }

  .landing-nav {
    width: 100%; max-width: 1100px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 24px 32px;
    position: relative; z-index: 10;
    animation: fadeIn 0.6s ease both;
  }
  .landing-nav-brand { display: flex; align-items: center; gap: 12px; }
  .landing-nav-brand .logo { width: 38px; height: 38px; border-radius: 12px; }
  .landing-nav-brand .app-name { font-size: 18px; }
  .landing-nav-tag {
    font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
    padding: 4px 10px; border-radius: 20px;
    background: rgba(45,212,191,0.1); color: var(--teal);
    border: 1px solid var(--teal-border); text-transform: uppercase;
  }

  .landing-hero {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; text-align: center;
    padding: 40px 24px 20px; max-width: 700px;
    position: relative; z-index: 10;
  }

  .landing-badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--accent-bg); border: 1px solid var(--accent-border);
    border-radius: 24px; padding: 6px 16px 6px 8px;
    font-size: 12px; font-weight: 600; color: var(--accent-2);
    margin-bottom: 28px;
    animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both;
  }
  .landing-badge-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--green);
    box-shadow: 0 0 8px rgba(16,185,129,0.5);
    animation: breathe 2s ease-in-out infinite;
  }

  .landing-h1 {
    font-size: clamp(36px, 6vw, 64px);
    font-weight: 900; line-height: 1.08; letter-spacing: -1.5px;
    color: var(--text); margin-bottom: 20px;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.2s both;
  }
  .landing-h1 .gradient {
    background: linear-gradient(135deg, #6366f1 0%, #a78bfa 40%, #2dd4bf 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .landing-sub {
    font-size: clamp(15px, 2vw, 18px);
    color: var(--text-2); line-height: 1.7; max-width: 520px;
    margin-bottom: 36px; font-weight: 400;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.3s both;
  }

  .landing-cta-row {
    display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    justify-content: center;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.4s both;
  }
  .landing-cta {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 16px 32px; border-radius: 16px; border: none;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white; font-size: 15px; font-weight: 700;
    cursor: pointer; letter-spacing: 0.1px;
    box-shadow: 0 8px 32px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.3);
    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Inter', sans-serif;
  }
  .landing-cta:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(99,102,241,0.5), 0 0 0 1px rgba(99,102,241,0.4);
  }
  .landing-cta:active { transform: translateY(0); }

  .landing-cta-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 16px 28px; border-radius: 16px;
    border: 1.5px solid var(--border-2);
    background: var(--surface); color: var(--text-2);
    font-size: 15px; font-weight: 600; cursor: pointer;
    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Inter', sans-serif;
  }
  .landing-cta-secondary:hover {
    border-color: var(--accent-border); color: var(--accent-2);
    background: var(--accent-bg); transform: translateY(-2px);
  }

  .landing-stats {
    display: flex; gap: 40px; margin-top: 48px;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.5s both;
  }
  .landing-stat { text-align: center; }
  .landing-stat-num {
    font-size: 28px; font-weight: 900; color: var(--text);
    letter-spacing: -0.5px; line-height: 1;
  }
  .landing-stat-label {
    font-size: 11px; color: var(--text-3); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px;
  }

  .landing-features {
    width: 100%; max-width: 1000px; padding: 40px 24px 20px;
    position: relative; z-index: 10;
  }
  .landing-features-label {
    text-align: center; font-size: 10px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase;
    color: var(--text-3); margin-bottom: 24px;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.55s both;
  }
  .landing-features-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
  }
  .landing-fcard {
    background: var(--surface); border: 1px solid var(--border-2);
    border-radius: var(--radius); padding: 22px 18px;
    transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
    position: relative; overflow: hidden;
  }
  .landing-fcard::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: var(--fcard-color, var(--accent));
    opacity: 0; transition: opacity 0.3s;
  }
  .landing-fcard:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: var(--border-2); }
  .landing-fcard:hover::before { opacity: 1; }
  .landing-fcard-icon {
    width: 42px; height: 42px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .landing-fcard h4 { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .landing-fcard p { font-size: 12.5px; color: var(--text-3); line-height: 1.55; font-weight: 500; }

  .landing-footer {
    width: 100%; padding: 24px 32px; text-align: center;
    position: relative; z-index: 10;
    animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) 0.7s both;
  }
  .landing-footer-text {
    font-size: 11.5px; color: var(--text-3); line-height: 1.6;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }

  /* ─── AUTH PAGE ─── */
  .auth-page {
    min-height: 100vh; width: 100%;
    display: flex; align-items: center; justify-content: center;
    background: var(--bg); position: relative; overflow: hidden;
    padding: 24px;
    animation: fadeIn 0.5s ease both;
  }
  .auth-bg-1 {
    position: absolute; top: -15%; left: -10%; width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 55%);
    filter: blur(80px); pointer-events: none;
  }
  .auth-bg-2 {
    position: absolute; bottom: -20%; right: -10%; width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 55%);
    filter: blur(80px); pointer-events: none;
  }
  .auth-card {
    width: 100%; max-width: 400px;
    background: var(--surface); border: 1px solid var(--border-2);
    border-radius: 24px; padding: 40px 32px;
    position: relative; z-index: 10;
    box-shadow: var(--shadow-lg);
    animation: fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both;
  }
  .auth-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 200px;
    background: linear-gradient(180deg, rgba(99,102,241,0.04) 0%, transparent 100%);
    pointer-events: none; border-radius: 24px 24px 0 0;
  }
  .auth-header {
    text-align: center; margin-bottom: 32px; position: relative;
  }
  .auth-logo {
    width: 52px; height: 52px; border-radius: 16px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
  }
  .auth-title {
    font-size: 22px; font-weight: 800; color: var(--text);
    letter-spacing: -0.5px; margin-bottom: 6px;
  }
  .auth-subtitle {
    font-size: 13px; color: var(--text-3); font-weight: 500;
  }
  .auth-tabs {
    display: flex; gap: 4px; margin-bottom: 28px;
    background: var(--surface2); border-radius: 12px; padding: 4px;
    position: relative;
  }
  .auth-tab {
    flex: 1; padding: 10px; border: none;
    background: transparent; border-radius: 10px;
    color: var(--text-3); cursor: pointer;
    font-size: 13px; font-weight: 600;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Inter', sans-serif;
  }
  .auth-tab.active {
    background: var(--accent-bg); color: var(--accent-2);
    box-shadow: 0 0 0 1px var(--accent-border);
  }
  .auth-tab:not(.active):hover { color: var(--text-2); }
  .auth-form { display: flex; flex-direction: column; gap: 16px; position: relative; }
  .auth-field { display: flex; flex-direction: column; gap: 6px; }
  .auth-label {
    font-size: 12px; font-weight: 600; color: var(--text-2);
    letter-spacing: 0.1px;
  }
  .auth-input {
    width: 100%; background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: 12px; padding: 13px 16px;
    color: var(--text); font-size: 14px; outline: none;
    transition: all 0.25s; font-weight: 400;
    font-family: 'Inter', sans-serif;
  }
  .auth-input:focus {
    border-color: var(--accent-border);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
  }
  .auth-input::placeholder { color: var(--text-3); }
  .auth-submit {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border: none; border-radius: 12px;
    color: white; font-weight: 700; font-size: 14px;
    cursor: pointer; letter-spacing: 0.1px;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
    font-family: 'Inter', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    margin-top: 4px;
  }
  .auth-submit:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(99,102,241,0.45);
  }
  .auth-submit:active { transform: translateY(0); }
  .auth-divider {
    display: flex; align-items: center; gap: 14px;
    margin: 4px 0;
  }
  .auth-divider::before, .auth-divider::after {
    content: ''; flex: 1; height: 1px;
    background: var(--border-2);
  }
  .auth-divider span {
    font-size: 11px; color: var(--text-3); font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px;
  }
  .auth-google {
    width: 100%; padding: 13px;
    background: var(--surface2); border: 1.5px solid var(--border-2);
    border-radius: 12px; color: var(--text);
    font-size: 13.5px; font-weight: 600; cursor: pointer;
    transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
    font-family: 'Inter', sans-serif;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .auth-google:hover {
    border-color: var(--accent-border); background: var(--accent-bg);
    transform: translateY(-1px);
  }
  .auth-google-icon {
    width: 18px; height: 18px;
  }
  .auth-footer {
    text-align: center; margin-top: 20px;
    font-size: 12px; color: var(--text-3);
  }
  .auth-footer a {
    color: var(--accent-2); text-decoration: none; font-weight: 600;
    cursor: pointer;
  }
  .auth-footer a:hover { text-decoration: underline; }
  .auth-back {
    position: absolute; top: -56px; left: 0;
    display: inline-flex; align-items: center; gap: 6px;
    background: none; border: none; color: var(--text-3);
    font-size: 12px; font-weight: 600; cursor: pointer;
    font-family: 'Inter', sans-serif; transition: color 0.2s;
  }
  .auth-back:hover { color: var(--accent-2); }
  .auth-error {
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    border-radius: 10px; padding: 10px 14px;
    font-size: 12.5px; color: #f87171; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
  }

  /* Transition from landing to app */
  .landing-exit {
    animation: landing-shrink 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }
  @keyframes landing-shrink {
    to { opacity: 0; transform: scale(0.95) translateY(-20px); }
  }
  .app-enter {
    animation: app-grow 0.6s cubic-bezier(0.16,1,0.3,1) 0.2s both;
  }
  @keyframes app-grow {
    from { opacity: 0; transform: scale(0.95) translateY(30px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  @media (max-width: 600px) {
    .landing-nav { padding: 18px 20px; }
    .landing-hero { padding: 30px 20px 16px; }
    .landing-stats { gap: 24px; }
    .landing-stat-num { font-size: 22px; }
    .landing-features { padding: 30px 16px 16px; }
    .landing-features-grid { grid-template-columns: 1fr 1fr; }
    .landing-cta-row { flex-direction: column; }
    .landing-cta, .landing-cta-secondary { width: 100%; justify-content: center; }
  }
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
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, system, messages }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Sorry, no response received.";
}

function fmtCurrency(n) {
  return "$" + n.toFixed(2);
}

function daysBetween(d1, d2) {
  return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
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
            <Icon name={icon} size={13} />{q}
          </button>
        ))}
      </div>
      <div className="msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`mrow ${m.role === "user" ? "u" : ""}`}
            style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}>
            {m.role === "assistant" && (
              <div className="av"><Icon name="scale" size={16} color="white" /></div>
            )}
            <div className={`bub ${m.role === "assistant" ? "ai" : "usr"}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="mrow" style={{ animation: "slideUp 0.3s ease both" }}>
            <div className="av"><Icon name="scale" size={16} color="white" /></div>
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
        <button className={`sbtn ${loading ? "loading" : input.trim() ? "on" : "off"}`}
          onClick={() => send()} disabled={!input.trim() || loading}>
          {loading ? <Icon name="loader" size={18} color="#818cf8" /> : <Icon name="send" size={18} color={input.trim() ? "white" : "#5a5a72"} />}
        </button>
      </div>
    </div>
  );
}

// ─── PAYSLIP AUDITOR ──────────────────────────────────────────────────────────

function PayslipAuditor({ onBack }) {
  const [award, setAward] = useState("");
  const [isCasual, setIsCasual] = useState(false);
  const [hourlyPaid, setHourlyPaid] = useState("");
  const [normalHrs, setNormalHrs] = useState("");
  const [satHrs, setSatHrs] = useState("");
  const [sunHrs, setSunHrs] = useState("");
  const [pubHolHrs, setPubHolHrs] = useState("");
  const [otHrs, setOtHrs] = useState("");
  const [result, setResult] = useState(null);

  function audit() {
    const rates = PENALTY_RATES[award];
    if (!rates) return;
    const paid = parseFloat(hourlyPaid) || 0;
    const normal = parseFloat(normalHrs) || 0;
    const sat = parseFloat(satHrs) || 0;
    const sun = parseFloat(sunHrs) || 0;
    const pub = parseFloat(pubHolHrs) || 0;
    const ot = parseFloat(otHrs) || 0;

    const baseRate = isCasual ? rates.base * rates.casual : rates.base;
    const shouldNormal = baseRate * normal;
    const shouldSat = baseRate * rates.sat * sat;
    const shouldSun = baseRate * rates.sun * sun;
    const shouldPub = baseRate * rates.pubHol * pub;
    const shouldOt = baseRate * rates.ot1 * ot;
    const shouldTotal = shouldNormal + shouldSat + shouldSun + shouldPub + shouldOt;

    const totalHrs = normal + sat + sun + pub + ot;
    const paidTotal = paid * totalHrs;
    const diff = shouldTotal - paidTotal;

    setResult({
      baseRate, paid, totalHrs,
      shouldNormal, shouldSat, shouldSun, shouldPub, shouldOt,
      shouldTotal, paidTotal, diff,
      satRate: baseRate * rates.sat,
      sunRate: baseRate * rates.sun,
      pubRate: baseRate * rates.pubHol,
      otRate: baseRate * rates.ot1,
    });
  }

  return (
    <div className="panel">
      <button className="back-btn" onClick={onBack}>
        <Icon name="arrow-left" size={16} /> Back to Tools
      </button>
      <div className="info-card" style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }}>
        <div className="ic-title" style={{ color: "#fbbf24" }}>
          <Icon name="search-dollar" size={16} color="#fbbf24" /> Payslip Auditor
        </div>
        <div className="ic-body">Enter your pay details and we'll calculate what you should have been paid based on your Modern Award.</div>
      </div>

      <div className="form-group">
        <div className="form-label">Your Award</div>
        <div className="select-wrap">
          <select value={award} onChange={e => setAward(e.target.value)}>
            <option value="">Select your award...</option>
            {Object.keys(PENALTY_RATES).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <button className={`option-btn ${isCasual ? "sel" : ""}`} onClick={() => setIsCasual(!isCasual)} style={{ padding: "10px 14px" }}>
          <div className="opt-radio">{isCasual && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}</div>
          <div>
            <div className="opt-label">I'm a casual employee</div>
            <div className="opt-desc">25% loading applied to base rate</div>
          </div>
        </button>
      </div>

      <div className="form-group">
        <div className="form-label">Hourly rate you're being paid</div>
        <input className="tinput" type="number" step="0.01" value={hourlyPaid} onChange={e => setHourlyPaid(e.target.value)} placeholder="e.g. 23.50" />
      </div>

      <div className="form-row">
        <div className="form-group">
          <div className="form-label">Normal hours</div>
          <input className="tinput" type="number" value={normalHrs} onChange={e => setNormalHrs(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <div className="form-label">Saturday hrs</div>
          <input className="tinput" type="number" value={satHrs} onChange={e => setSatHrs(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <div className="form-label">Sunday hrs</div>
          <input className="tinput" type="number" value={sunHrs} onChange={e => setSunHrs(e.target.value)} placeholder="0" />
        </div>
        <div className="form-group">
          <div className="form-label">Public holiday hrs</div>
          <input className="tinput" type="number" value={pubHolHrs} onChange={e => setPubHolHrs(e.target.value)} placeholder="0" />
        </div>
      </div>
      <div className="form-group">
        <div className="form-label">Overtime hours</div>
        <input className="tinput" type="number" value={otHrs} onChange={e => setOtHrs(e.target.value)} placeholder="0" />
      </div>

      <button className="pbtn" onClick={audit} disabled={!award || !hourlyPaid}>
        Audit My Pay <Icon name="arrow-right" size={16} />
      </button>

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="result-header-icon" style={{ background: result.diff > 0 ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)" }}>
              <Icon name={result.diff > 0 ? "alert-tri" : "check-circle"} size={20} color={result.diff > 0 ? "#ef4444" : "#10b981"} />
            </div>
            <h4>{result.diff > 0 ? "Potential Underpayment" : "Pay Looks Correct"}</h4>
            {result.diff > 0 && <span className="tag" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>Underpaid</span>}
          </div>
          <div className="result-body">
            <div className="result-row">
              <span className="label">Minimum base rate {isCasual ? "(casual)" : ""}</span>
              <span className="value">{fmtCurrency(result.baseRate)}/hr</span>
            </div>
            <div className="result-row">
              <span className="label">You're being paid</span>
              <span className={`value ${result.paid < result.baseRate ? "red" : ""}`}>{fmtCurrency(result.paid)}/hr</span>
            </div>
            {parseFloat(satHrs) > 0 && <div className="result-row"><span className="label">Saturday rate</span><span className="value">{fmtCurrency(result.satRate)}/hr</span></div>}
            {parseFloat(sunHrs) > 0 && <div className="result-row"><span className="label">Sunday rate</span><span className="value">{fmtCurrency(result.sunRate)}/hr</span></div>}
            {parseFloat(pubHolHrs) > 0 && <div className="result-row"><span className="label">Public holiday rate</span><span className="value">{fmtCurrency(result.pubRate)}/hr</span></div>}
            {parseFloat(otHrs) > 0 && <div className="result-row"><span className="label">Overtime rate</span><span className="value">{fmtCurrency(result.otRate)}/hr</span></div>}
            <div className="result-row">
              <span className="label">You were paid (total)</span>
              <span className="value">{fmtCurrency(result.paidTotal)}</span>
            </div>
            <div className="result-row">
              <span className="label">You should have received</span>
              <span className="value green">{fmtCurrency(result.shouldTotal)}</span>
            </div>
          </div>
          {result.diff > 0 && (
            <div className="result-total">
              <span className="label">You may be owed</span>
              <span className="value" style={{ color: "#ef4444" }}>{fmtCurrency(result.diff)}</span>
            </div>
          )}
        </div>
      )}
      {result && result.diff > 0 && (
        <div className="disclaimer">
          <Icon name="info" size={16} color="#fbbf24" />
          <div>These are minimum award rates. Your actual entitlements may differ based on your specific award classification, enterprise agreement, or contract. Report underpayments to the <strong>Fair Work Ombudsman</strong> at fairwork.gov.au</div>
        </div>
      )}
    </div>
  );
}

// ─── ELIGIBILITY CHECKER (WIZARD) ────────────────────────────────────────────

function EligibilityChecker({ onBack }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const steps = [
    { q: "How were you dismissed?", key: "dismissal_type", options: [
      { value: "employer", label: "Employer terminated my employment", desc: "Your boss/company ended your employment" },
      { value: "constructive", label: "I resigned due to employer conduct", desc: "You felt forced to resign (constructive dismissal)" },
      { value: "fixed_term", label: "Fixed-term contract ended early", desc: "Contract was terminated before its end date" },
      { value: "natural", label: "Contract ended naturally", desc: "Fixed-term contract ran its full course" },
      { value: "training", label: "Training arrangement ended", desc: "Apprenticeship or traineeship completed" },
    ]},
    { q: "How long did you work there?", key: "service_length", options: [
      { value: "under_6m", label: "Less than 6 months" },
      { value: "6m_to_1y", label: "6 months to 1 year" },
      { value: "over_1y", label: "More than 1 year" },
    ]},
    { q: "How many employees at the business?", key: "employer_size", options: [
      { value: "small", label: "Under 15 employees", desc: "Small business" },
      { value: "large", label: "15 or more employees", desc: "Not a small business" },
    ]},
    { q: "What's your annual income?", key: "income", options: [
      { value: "under", label: "Under $175,000/year", desc: "Below the high income threshold" },
      { value: "over_covered", label: "Over $175,000 but covered by an award", desc: "Award or enterprise agreement applies" },
      { value: "over_not_covered", label: "Over $175,000, no award coverage", desc: "No modern award or enterprise agreement" },
    ]},
    { q: "When were you dismissed?", key: "timing", options: [
      { value: "within_21", label: "Within the last 21 days" },
      { value: "over_21", label: "More than 21 days ago" },
    ]},
  ];

  function answer(value) {
    const newAnswers = { ...answers, [steps[step].key]: value };
    setAnswers(newAnswers);
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  }

  function getResult() {
    const a = answers;
    const issues = [];
    let eligible = true;

    if (a.dismissal_type === "natural" || a.dismissal_type === "training") {
      return { eligible: false, reason: "You have not been 'dismissed' under the Fair Work Act. Unfair dismissal claims require that your employment was terminated by the employer, or that you were forced to resign.", issues: [], actions: [] };
    }
    if (a.employer_size === "small" && (a.service_length === "under_6m" || a.service_length === "6m_to_1y")) {
      issues.push("Small businesses require 1 year minimum service for unfair dismissal eligibility.");
      if (a.service_length === "under_6m") eligible = false;
      if (a.service_length === "6m_to_1y") eligible = false;
    }
    if (a.employer_size === "large" && a.service_length === "under_6m") {
      issues.push("You need at least 6 months of service with a non-small business employer.");
      eligible = false;
    }
    if (a.income === "over_not_covered") {
      issues.push("You earn over the high income threshold and aren't covered by an award or enterprise agreement.");
      eligible = false;
    }
    if (a.timing === "over_21") {
      issues.push("The 21-day filing deadline has passed. You may apply for an extension, but this is granted only in exceptional circumstances.");
    }

    const actions = eligible
      ? ["Lodge Form F2 with the Fair Work Commission immediately", "Gather evidence: termination letter, employment contract, payslips, any correspondence", "Consider seeking legal advice from a workplace lawyer or community legal centre"]
      : ["Consider a General Protections claim (Form F8) if dismissal was for a prohibited reason", "Contact the Fair Work Ombudsman for advice on other options", "Seek free legal advice from a community legal centre"];

    return {
      eligible,
      reason: eligible
        ? "Based on your answers, you appear to meet the eligibility criteria for an unfair dismissal claim."
        : "Based on your answers, you may not be eligible for an unfair dismissal claim. However, other remedies may be available.",
      issues,
      actions,
    };
  }

  const allAnswered = Object.keys(answers).length === steps.length;
  const result = allAnswered ? getResult() : null;

  return (
    <div className="panel">
      <button className="back-btn" onClick={onBack}>
        <Icon name="arrow-left" size={16} /> Back to Tools
      </button>
      <div className="info-card" style={{ background: "rgba(16,185,129,0.08)", borderColor: "rgba(16,185,129,0.2)" }}>
        <div className="ic-title" style={{ color: "#10b981" }}>
          <Icon name="check-circle" size={16} color="#10b981" /> Unfair Dismissal Eligibility
        </div>
        <div className="ic-body">Answer 5 quick questions to find out if you can lodge an unfair dismissal claim.</div>
      </div>

      <div className="wizard-progress">
        {steps.map((_, i) => (
          <div key={i} className={`wizard-dot ${i < step ? "done" : i === step ? "active" : ""}`} />
        ))}
      </div>

      {!allAnswered && (
        <div className="wizard-step" key={step}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
            {steps[step].q}
          </div>
          <div className="option-grid">
            {steps[step].options.map(opt => (
              <button key={opt.value} className={`option-btn ${answers[steps[step].key] === opt.value ? "sel" : ""}`}
                onClick={() => answer(opt.value)}>
                <div className="opt-radio" />
                <div>
                  <div className="opt-label">{opt.label}</div>
                  {opt.desc && <div className="opt-desc">{opt.desc}</div>}
                </div>
              </button>
            ))}
          </div>
          {step > 0 && (
            <button className="back-btn" onClick={() => setStep(step - 1)} style={{ marginTop: 14 }}>
              <Icon name="arrow-left" size={14} /> Previous question
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="result-header-icon" style={{ background: result.eligible ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
              <Icon name={result.eligible ? "check-circle" : "x"} size={20} color={result.eligible ? "#10b981" : "#ef4444"} />
            </div>
            <h4>{result.eligible ? "Likely Eligible" : "May Not Be Eligible"}</h4>
            <span className="tag" style={{
              background: result.eligible ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              color: result.eligible ? "#10b981" : "#ef4444",
              border: `1px solid ${result.eligible ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
            }}>{result.eligible ? "Eligible" : "Review"}</span>
          </div>
          <div className="result-body">
            <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 12 }}>{result.reason}</p>
            {result.issues.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--amber)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Issues</div>
                {result.issues.map((iss, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--text-2)", padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <Icon name="alert-tri" size={14} color="#fbbf24" />{iss}
                  </div>
                ))}
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--green)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Next Steps</div>
              {result.actions.map((act, i) => (
                <div key={i} style={{ fontSize: 12, color: "var(--text-2)", padding: "6px 0", display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <Icon name="arrow-right" size={14} color="#10b981" />{act}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {allAnswered && (
        <button className="pbtn" onClick={() => { setStep(0); setAnswers({}); }} style={{ background: "var(--surface3)", boxShadow: "none", color: "var(--text-2)" }}>
          Start Over
        </button>
      )}
    </div>
  );
}

// ─── NOTICE & REDUNDANCY CALCULATOR ──────────────────────────────────────────

function NoticeCalc({ onBack }) {
  const [years, setYears] = useState("");
  const [age, setAge] = useState("");
  const [weeklyPay, setWeeklyPay] = useState("");
  const [isSmallBiz, setIsSmallBiz] = useState(false);
  const [result, setResult] = useState(null);

  function calculate() {
    const y = parseFloat(years) || 0;
    const a = parseFloat(age) || 0;
    const w = parseFloat(weeklyPay) || 0;

    // Notice period
    let noticeWeeks = 0;
    if (y < 1) noticeWeeks = 1;
    else if (y < 3) noticeWeeks = 2;
    else if (y < 5) noticeWeeks = 3;
    else noticeWeeks = 4;
    if (a >= 45 && y >= 2) noticeWeeks += 1;

    // Redundancy pay
    let redundancyWeeks = 0;
    if (!isSmallBiz) {
      if (y >= 10) redundancyWeeks = 12;
      else if (y >= 9) redundancyWeeks = 16;
      else if (y >= 8) redundancyWeeks = 14;
      else if (y >= 7) redundancyWeeks = 13;
      else if (y >= 6) redundancyWeeks = 11;
      else if (y >= 5) redundancyWeeks = 10;
      else if (y >= 4) redundancyWeeks = 8;
      else if (y >= 3) redundancyWeeks = 7;
      else if (y >= 2) redundancyWeeks = 6;
      else if (y >= 1) redundancyWeeks = 4;
    }

    setResult({
      noticeWeeks,
      noticePay: noticeWeeks * w,
      redundancyWeeks,
      redundancyPay: redundancyWeeks * w,
      totalPay: (noticeWeeks + redundancyWeeks) * w,
      extraWeek: a >= 45 && y >= 2,
    });
  }

  return (
    <div className="panel">
      <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Tools</button>
      <div className="info-card" style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)" }}>
        <div className="ic-title"><Icon name="calculator" size={16} color="#818cf8" /> Notice & Redundancy Calculator</div>
        <div className="ic-body">Calculate your minimum notice period and redundancy entitlements under the National Employment Standards.</div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <div className="form-label">Years of service</div>
          <input className="tinput" type="number" step="0.1" value={years} onChange={e => setYears(e.target.value)} placeholder="e.g. 3.5" />
        </div>
        <div className="form-group">
          <div className="form-label">Your age</div>
          <input className="tinput" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 35" />
        </div>
      </div>
      <div className="form-group">
        <div className="form-label">Weekly pay (before tax)</div>
        <input className="tinput" type="number" step="0.01" value={weeklyPay} onChange={e => setWeeklyPay(e.target.value)} placeholder="e.g. 1200" />
      </div>
      <button className={`option-btn ${isSmallBiz ? "sel" : ""}`} onClick={() => setIsSmallBiz(!isSmallBiz)} style={{ padding: "10px 14px" }}>
        <div className="opt-radio">{isSmallBiz && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}</div>
        <div>
          <div className="opt-label">Small business (under 15 employees)</div>
          <div className="opt-desc">Exempt from NES redundancy pay</div>
        </div>
      </button>

      <button className="pbtn" onClick={calculate} disabled={!years || !weeklyPay}>
        Calculate Entitlements <Icon name="arrow-right" size={16} />
      </button>

      {result && (
        <div className="result-card">
          <div className="result-header">
            <div className="result-header-icon" style={{ background: "rgba(99,102,241,0.1)" }}>
              <Icon name="calculator" size={20} color="#818cf8" />
            </div>
            <h4>Your Entitlements</h4>
          </div>
          <div className="result-body">
            <div className="result-row">
              <span className="label">Notice period</span>
              <span className="value">{result.noticeWeeks} week{result.noticeWeeks !== 1 ? "s" : ""}</span>
            </div>
            {result.extraWeek && (
              <div className="result-row">
                <span className="label" style={{ fontSize: 11, color: "var(--text-3)" }}>Includes +1 week (age 45+, 2+ years)</span>
                <span className="value" style={{ color: "var(--green)", fontSize: 12 }}>Applied</span>
              </div>
            )}
            <div className="result-row">
              <span className="label">Notice pay</span>
              <span className="value green">{fmtCurrency(result.noticePay)}</span>
            </div>
            <div className="result-row">
              <span className="label">Redundancy pay ({result.redundancyWeeks} weeks)</span>
              <span className="value green">{result.redundancyWeeks > 0 ? fmtCurrency(result.redundancyPay) : isSmallBiz ? "Exempt" : "N/A"}</span>
            </div>
          </div>
          <div className="result-total">
            <span className="label">Total minimum entitlement</span>
            <span className="value">{fmtCurrency(result.totalPay)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SCENARIO TRIAGE ─────────────────────────────────────────────────────────

function ScenarioTriage({ onBack }) {
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function triage() {
    setLoading(true); setResult("");
    try {
      const reply = await callClaude(TRIAGE_PROMPT, [{
        role: "user", content: `Here is my workplace situation:\n\n${situation}`
      }]);
      setResult(reply);
    } catch { setResult("Something went wrong. Please try again."); }
    setLoading(false);
  }

  return (
    <div className="panel">
      <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Tools</button>
      <div className="info-card" style={{ background: "rgba(236,72,153,0.08)", borderColor: "rgba(236,72,153,0.2)" }}>
        <div className="ic-title" style={{ color: "#ec4899" }}>
          <Icon name="compass" size={16} color="#ec4899" /> What Just Happened?
        </div>
        <div className="ic-body">Describe what happened at work and we'll classify the issue, tell you where to go, and what to do next.</div>
      </div>

      <div className="form-group">
        <div className="form-label">Describe your situation</div>
        <textarea className="tarea" rows={5} value={situation} onChange={e => setSituation(e.target.value)}
          placeholder={"e.g. \"My boss reduced my shifts from 5 to 2 days after I raised a safety concern. I've worked there for 2 years as a casual...\""} />
      </div>

      <button className={`pbtn ${loading ? "loading-btn" : ""}`} onClick={triage} disabled={loading || !situation.trim()}>
        {loading ? <><Icon name="loader" size={16} /> Analysing...</> : <>Analyse My Situation <Icon name="arrow-right" size={16} /></>}
      </button>

      {result && <div className="rbox">{result}</div>}
    </div>
  );
}

// ─── DEADLINE TRACKER ────────────────────────────────────────────────────────

function DeadlineTracker({ onBack }) {
  const [selected, setSelected] = useState(null);
  const [eventDate, setEventDate] = useState("");
  const [tracked, setTracked] = useState([]);

  function addDeadline() {
    if (!selected || !eventDate) return;
    const event = new Date(eventDate);
    const deadlineInfo = DEADLINE_TYPES.find(d => d.id === selected);
    const deadlineDate = deadlineInfo.days ? new Date(event.getTime() + deadlineInfo.days * 24 * 60 * 60 * 1000) : null;
    const daysLeft = deadlineDate ? daysBetween(new Date(), deadlineDate) : null;

    setTracked(prev => [...prev, {
      ...deadlineInfo, eventDate: event, deadlineDate, daysLeft,
      id: deadlineInfo.id + "_" + Date.now(),
    }]);
    setSelected(null);
    setEventDate("");
  }

  function removeDeadline(id) {
    setTracked(prev => prev.filter(d => d.id !== id));
  }

  return (
    <div className="panel">
      <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Tools</button>
      <div className="info-card" style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }}>
        <div className="ic-title" style={{ color: "#ef4444" }}>
          <Icon name="clock" size={16} color="#ef4444" /> Deadline Tracker
        </div>
        <div className="ic-body">Employment law has strict time limits. Track your deadlines so you don't miss your window to act.</div>
      </div>

      <div className="form-group">
        <div className="form-label">Type of claim</div>
        <div className="select-wrap">
          <select value={selected || ""} onChange={e => setSelected(e.target.value || null)}>
            <option value="">Select a claim type...</option>
            {DEADLINE_TYPES.map(d => (
              <option key={d.id} value={d.id}>{d.label}{d.days ? ` (${d.days} days)` : " (no strict limit)"}</option>
            ))}
          </select>
        </div>
      </div>

      {selected && (
        <div style={{ animation: "slideUp 0.2s ease" }}>
          <div className="form-group">
            <div className="form-label">When did the event occur?</div>
            <input className="tinput" type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
          </div>
          <button className="pbtn" onClick={addDeadline} disabled={!eventDate} style={{ marginTop: 12 }}>
            <Icon name="plus" size={16} /> Track This Deadline
          </button>
        </div>
      )}

      {tracked.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="slabel">Your tracked deadlines</div>
          {tracked.map(d => {
            const urgent = d.daysLeft !== null && d.daysLeft <= 7;
            const warning = d.daysLeft !== null && d.daysLeft <= 14 && d.daysLeft > 7;
            const expired = d.daysLeft !== null && d.daysLeft < 0;
            return (
              <div key={d.id} className={`deadline-card ${urgent || expired ? "urgent" : warning ? "warning" : ""}`}>
                <div className="dl-top">
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, boxShadow: `0 0 8px ${d.color}40` }} />
                  <span className="dl-type">{d.label}</span>
                  <button onClick={() => removeDeadline(d.id)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Icon name="x" size={14} color="#5a5a72" />
                  </button>
                </div>
                <div className="dl-body">{d.desc}</div>
                {d.daysLeft !== null ? (
                  <div className="dl-countdown">
                    {expired ? (
                      <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>EXPIRED {Math.abs(d.daysLeft)} days ago</span>
                    ) : (
                      <>
                        <div style={{ textAlign: "center" }}>
                          <div className="num" style={{ color: urgent ? "#ef4444" : warning ? "#fbbf24" : "var(--text)" }}>{d.daysLeft}</div>
                          <div className="unit">days left</div>
                        </div>
                        <span className="sep">|</span>
                        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                          Due: {d.deadlineDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="dl-countdown">
                    <span style={{ color: "var(--text-2)", fontSize: 12 }}>No strict time limit — but act promptly</span>
                  </div>
                )}
                <div className="dl-meta">
                  <span className="dl-tag">{d.body}</span>
                  {d.form && <span className="dl-tag">{d.form}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── EVIDENCE CHECKLIST ──────────────────────────────────────────────────────

function EvidenceChecklist({ onBack }) {
  const [situation, setSituation] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState({});

  async function generate() {
    setLoading(true); setResult(""); setChecked({});
    try {
      const reply = await callClaude(EVIDENCE_PROMPT, [{
        role: "user", content: `My workplace issue:\n\n${situation}`
      }]);
      setResult(reply);
    } catch { setResult("Something went wrong. Please try again."); }
    setLoading(false);
  }

  return (
    <div className="panel">
      <button className="back-btn" onClick={onBack}><Icon name="arrow-left" size={16} /> Back to Tools</button>
      <div className="info-card" style={{ background: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.2)" }}>
        <div className="ic-title" style={{ color: "#8b5cf6" }}>
          <Icon name="clipboard" size={16} color="#8b5cf6" /> Evidence Checklist Builder
        </div>
        <div className="ic-body">Get a custom checklist of evidence to collect for your specific situation — before it disappears.</div>
      </div>

      <div className="form-group">
        <div className="form-label">Describe your situation</div>
        <textarea className="tarea" rows={4} value={situation} onChange={e => setSituation(e.target.value)}
          placeholder='e.g. "I was dismissed after reporting safety issues. I worked as a kitchen hand for 2 years..."' />
      </div>

      <button className={`pbtn ${loading ? "loading-btn" : ""}`} onClick={generate} disabled={loading || !situation.trim()}>
        {loading ? <><Icon name="loader" size={16} /> Building checklist...</> : <>Build My Evidence Checklist <Icon name="arrow-right" size={16} /></>}
      </button>

      {result && <div className="rbox">{result}</div>}
    </div>
  );
}

// ─── TOOLS HUB ───────────────────────────────────────────────────────────────

function ToolsTab() {
  const [activeTool, setActiveTool] = useState(null);

  if (activeTool === "payslip") return <PayslipAuditor onBack={() => setActiveTool(null)} />;
  if (activeTool === "eligibility") return <EligibilityChecker onBack={() => setActiveTool(null)} />;
  if (activeTool === "notice") return <NoticeCalc onBack={() => setActiveTool(null)} />;
  if (activeTool === "triage") return <ScenarioTriage onBack={() => setActiveTool(null)} />;
  if (activeTool === "deadline") return <DeadlineTracker onBack={() => setActiveTool(null)} />;
  if (activeTool === "evidence") return <EvidenceChecklist onBack={() => setActiveTool(null)} />;

  return (
    <div className="panel">
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>Workplace Tools</div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>Calculators, checkers, and trackers for your rights</div>
      </div>
      <div className="tools-grid">
        {TOOLS_LIST.map((tool, i) => (
          <button key={tool.id} className="tool-card" onClick={() => setActiveTool(tool.id)}
            style={{ "--tool-color": tool.color, animationDelay: `${i * 0.05}s`, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both" }}>
            <div className="tool-icon" style={{ background: tool.bg }}>
              <Icon name={tool.icon} size={20} color={tool.color} />
            </div>
            <div className="tool-label">{tool.label}</div>
            <div className="tool-desc">{tool.desc}</div>
          </button>
        ))}
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
        content: `Industry: ${industry || "unknown"}. Role: ${role || "unknown"}. What Modern Award covers this person and what are their key minimum entitlements? Include actual dollar amounts for hourly rates and penalty rates.`
      }]);
      setResult(reply);
    } catch { setResult("Something went wrong. Please try again."); }
    setLoading(false);
  }

  return (
    <div className="panel">
      <div className="info-card">
        <div className="ic-title"><Icon name="info" size={16} color="#818cf8" /> What's a Modern Award?</div>
        <div className="ic-body">Modern Awards set minimum pay rates, penalty rates, and entitlements for specific industries. Over 120 awards cover most Australian workers.</div>
      </div>
      <div>
        <div className="slabel">Select your industry</div>
        <div className="ind-grid">
          {AWARD_INDUSTRIES.map(ind => (
            <button key={ind.name} className={`ichip ${industry === ind.name ? "sel" : ""}`}
              onClick={() => setIndustry(ind.name)}>
              <Icon name={ind.icon} size={18} /><span>{ind.name}</span>
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
        {loading ? <><Icon name="loader" size={16} /> Looking up your award...</> : <>Find My Award & Entitlements <Icon name="arrow-right" size={16} /></>}
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
            <button key={lt.id} className={`lcard ${selected?.id === lt.id ? "sel" : ""}`}
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
            {loading ? <><Icon name="loader" size={16} /> Generating...</> : <>Generate {selected.label} <Icon name="arrow-right" size={16} /></>}
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
          <div className="rarr"><Icon name="external" size={16} /></div>
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

// ─── LANDING PAGE ────────────────────────────────────────────────────────────

const LANDING_FEATURES = [
  { icon: "message",       color: "#6366f1", title: "AI Legal Chat",       desc: "Get instant answers on workplace rights, entitlements & obligations" },
  { icon: "search-dollar", color: "#f59e0b", title: "Payslip Auditor",     desc: "Check if you're being underpaid against your Modern Award rates" },
  { icon: "compass",       color: "#ec4899", title: "Situation Triage",    desc: "Classify your issue & get tailored next steps in seconds" },
  { icon: "file-text",     color: "#8b5cf6", title: "Letter Generator",    desc: "Professional workplace letters with legal references built in" },
  { icon: "clock",         color: "#ef4444", title: "Deadline Tracker",    desc: "Never miss a critical filing window for your claim" },
  { icon: "clipboard",     color: "#10b981", title: "Evidence Checklist",  desc: "Know exactly what to collect before it disappears" },
];

function LandingPage({ onEnter }) {
  const [exiting, setExiting] = useState(false);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(() => onEnter(), 450);
  };

  return (
    <div className={`landing ${exiting ? "landing-exit" : ""}`}>
      <div className="landing-bg-1" />
      <div className="landing-bg-2" />
      <div className="landing-bg-3" />

      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="logo"><Icon name="shield" size={20} color="white" strokeWidth={2} /></div>
          <div className="app-name">Unfired</div>
        </div>
        <div className="landing-nav-tag">Free & Open Source</div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <h1 className="landing-h1">
          Know your <span className="gradient">workplace rights</span> before it's too late
        </h1>

        <p className="landing-sub">
          Free AI-powered assistant for Australian workers. Check your pay, understand your entitlements, and take action — all in one place.
        </p>

        <div className="landing-cta-row">
          <button className="landing-cta" onClick={handleEnter}>
            Get Started <Icon name="arrow-right" size={18} color="white" />
          </button>
          <button className="landing-cta-secondary" onClick={handleEnter}>
            <Icon name="compass" size={17} /> Explore Tools
          </button>
        </div>

        <div className="landing-stats">
          <div className="landing-stat">
            <div className="landing-stat-num">6</div>
            <div className="landing-stat-label">Free Tools</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-num">21</div>
            <div className="landing-stat-label">Day Claim Limit</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-num">24/7</div>
            <div className="landing-stat-label">AI Available</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="landing-features">
        <div className="landing-features-label">Everything you need</div>
        <div className="landing-features-grid">
          {LANDING_FEATURES.map((f, i) => (
            <div key={f.title} className="landing-fcard"
              style={{ "--fcard-color": f.color, animation: `fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) ${0.6 + i * 0.07}s both` }}>
              <div className="landing-fcard-icon" style={{ background: `${f.color}15` }}>
                <Icon name={f.icon} size={20} color={f.color} />
              </div>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <div className="landing-footer-text">
          <Icon name="alert-tri" size={13} color="#fbbf24" />
          General information only, not legal advice. For serious matters, consult a lawyer.
        </div>
      </div>
    </div>
  );
}

// ─── AUTH PAGE ───────────────────────────────────────────────────────────────

function AuthPage({ onLogin, onBack }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    // TODO: Wire up real auth (Firebase, Supabase, etc.)
    onLogin({ email, name: name || email.split("@")[0] });
  };

  const handleGoogleLogin = () => {
    // TODO: Wire up Google OAuth
    onLogin({ email: "user@gmail.com", name: "User" });
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-1" />
      <div className="auth-bg-2" />

      <div style={{ position: "relative" }}>
        <button className="auth-back" onClick={onBack}>
          <Icon name="arrow-left" size={16} /> Back
        </button>

        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Icon name="shield" size={26} color="white" strokeWidth={2} />
            </div>
            <div className="auth-title">{mode === "login" ? "Welcome back" : "Create account"}</div>
            <div className="auth-subtitle">
              {mode === "login" ? "Sign in to access your workspace" : "Get started with Unfired for free"}
            </div>
          </div>

          <div className="auth-tabs">
            <button className={`auth-tab ${mode === "login" ? "active" : ""}`} onClick={() => { setMode("login"); setError(""); }}>
              Sign In
            </button>
            <button className={`auth-tab ${mode === "signup" ? "active" : ""}`} onClick={() => { setMode("signup"); setError(""); }}>
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error">
                <Icon name="alert-tri" size={14} color="#f87171" /> {error}
              </div>
            )}

            {mode === "signup" && (
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <input className="auth-input" type="text" placeholder="Your name"
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label">Email</label>
              <input className="auth-input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input className="auth-input" type="password" placeholder="Min. 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button type="submit" className="auth-submit">
              {mode === "login" ? "Sign In" : "Create Account"}
              <Icon name="arrow-right" size={17} color="white" />
            </button>

            <div className="auth-divider"><span>or</span></div>

            <button type="button" className="auth-google" onClick={handleGoogleLogin}>
              <svg className="auth-google-icon" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="auth-footer">
            {mode === "login" ? (
              <>Don't have an account? <a onClick={() => { setMode("signup"); setError(""); }}>Sign up</a></>
            ) : (
              <>Already have an account? <a onClick={() => { setMode("login"); setError(""); }}>Sign in</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "chat",      icon: "message",   label: "Ask AI"    },
  { id: "tools",     icon: "grid",      label: "Tools"     },
  { id: "letters",   icon: "file-text", label: "Letters"   },
  { id: "award",     icon: "dollar",    label: "Award"     },
  { id: "resources", icon: "link",      label: "Info"      },
];

export default function App() {
  const [tab, setTab] = useState("chat");
  const [page, setPage] = useState("landing"); // "landing" | "auth" | "app"
  const [user, setUser] = useState(null);

  const handleLandingEnter = () => setPage("auth");
  const handleLogin = (userData) => { setUser(userData); setPage("app"); };
  const handleBackToLanding = () => setPage("landing");

  return (
    <>
      <style>{CSS}</style>
      {page === "landing" && (
        <LandingPage onEnter={handleLandingEnter} />
      )}
      {page === "auth" && (
        <AuthPage onLogin={handleLogin} onBack={handleBackToLanding} />
      )}
      {page === "app" && (
        <div className="app-enter" style={{
          minHeight: "100vh",
          background: "#0a0a0f",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "fixed", top: "-10%", left: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)", pointerEvents: "none", filter: "blur(40px)" }} />
          <div style={{ position: "fixed", bottom: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)", pointerEvents: "none", filter: "blur(40px)" }} />
          <div style={{ position: "fixed", top: "40%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,212,191,0.03) 0%, transparent 60%)", pointerEvents: "none", filter: "blur(40px)" }} />

          <div className="shell">
            <div className="header">
              <div className="header-row">
                <div className="logo"><Icon name="shield" size={22} color="white" strokeWidth={2} /></div>
                <div>
                  <div className="app-name">Unfired</div>
                  <div className="app-sub">Australian Workplace Rights</div>
                </div>
                <div className="status-dot">Online</div>
              </div>
            </div>

            <div className="tabs">
              {TABS.map(t => (
                <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
                  <span className="ti"><Icon name={t.icon} size={17} color={tab === t.id ? "#818cf8" : "#5a5a72"} /></span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="content">
              {tab === "chat"      && <ChatTab />}
              {tab === "tools"     && <ToolsTab />}
              {tab === "letters"   && <LettersTab />}
              {tab === "award"     && <AwardTab />}
              {tab === "resources" && <ResourcesTab />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
