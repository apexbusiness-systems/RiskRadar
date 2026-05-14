/* ── Mock data for DueRadar Command Center ── */
import type {} from "react";

export const RR_DATA = {
  meta: {
    workspace: "Northwind Operations",
    operator: "Sarah Chen",
    now: "Tue 12 May 2026 · 09:42",
    total: 47,
    monitored: 44,
    protectedShare: 0.74,
  },

  buckets: {
    critical: 3,
    thisWeek: 7,
    noOwner: 4,
    noReminder: 6,
    protected: 27,
  },

  hero: {
    id: "RR-014",
    name: "General Liability Insurance",
    type: "Insurance",
    daysUntil: 4,
    dueDate: "Sat 16 May 2026",
    exposure: "Critical",
    owner: { name: "Sarah Chen", initials: "SC" },
    backup: { name: "James Okafor", initials: "JO" },
    noticeCloses: "Fri 15 May · 17:00",
    noticeProgress: 0.82,
    nextAction: "Renew policy or upload proof of binder",
  },

  radar: [
    { id: "RR-014", name: "General Liability Insurance", type: "insurance", days: 4, angle: 312, exposure: "crit" as const },
    { id: "RR-027", name: "Q2 SOC 2 attestation", type: "cert", days: 6, angle: 18, exposure: "high" as const },
    { id: "RR-031", name: "Anvil Logistics MSA", type: "contract", days: 11, angle: 64, exposure: "high" as const },
    { id: "RR-008", name: "Liquor License — Boston", type: "license", days: 19, angle: 110, exposure: "high" as const },
    { id: "RR-019", name: "Workers' Comp renewal", type: "insurance", days: 23, angle: 158, exposure: "high" as const },
    { id: "RR-002", name: "Fire Marshal inspection", type: "permit", days: 28, angle: 200, exposure: "med" as const },
    { id: "RR-022", name: "Salesforce Enterprise", type: "subs", days: 34, angle: 244, exposure: "med" as const },
    { id: "RR-005", name: "Building Permit · Wing C", type: "permit", days: 41, angle: 286, exposure: "med" as const },
    { id: "RR-011", name: "Cyber liability rider", type: "insurance", days: 52, angle: 340, exposure: "med" as const },
    { id: "RR-018", name: "OSHA refresher training", type: "cert", days: 61, angle: 26, exposure: "med" as const },
    { id: "RR-024", name: "Acme Foods supply contract", type: "contract", days: 73, angle: 78, exposure: "med" as const },
    { id: "RR-029", name: "Datadog APM", type: "subs", days: 84, angle: 130, exposure: "low" as const },
    { id: "RR-037", name: "Annual food handler cert", type: "cert", days: 96, angle: 178, exposure: "low" as const },
    { id: "RR-041", name: "Elevator inspection", type: "permit", days: 118, angle: 220, exposure: "low" as const },
    { id: "RR-045", name: "PCI-DSS attestation", type: "cert", days: 152, angle: 268, exposure: "low" as const },
    { id: "RR-009", name: "Vendor — Stripe", type: "contract", days: 180, angle: 4, exposure: "low" as const },
  ],

  register: [
    { id: "RR-014", name: "General Liability Insurance", sub: "Hartford · Policy #HL-9921", type: "insurance", days: 4, due: "16 May", owner: "SC" as const | null, exposure: "crit" as const, action: "Renew policy", status: "crit" as const },
    { id: "RR-027", name: "Q2 SOC 2 attestation", sub: "Vanta engagement · Q2 2026", type: "cert", days: 6, due: "18 May", owner: "JO" as const | null, exposure: "high" as const, action: "Upload evidence (12 left)", status: "notice" as const },
    { id: "RR-031", name: "Anvil Logistics MSA", sub: "Auto-renews if no notice", type: "contract", days: 11, due: "23 May", owner: null, exposure: "high" as const, action: "Send notice by Friday", status: "notice" as const },
    { id: "RR-008", name: "Liquor License — Boston", sub: "MA ABCC — annual", type: "license", days: 19, due: "31 May", owner: "MR" as const | null, exposure: "high" as const, action: "File renewal", status: "armed" as const },
    { id: "RR-019", name: "Workers' Comp renewal", sub: "The Hartford · WC-44213", type: "insurance", days: 23, due: "4 Jun", owner: "SC" as const | null, exposure: "high" as const, action: "Request quotes", status: "armed" as const },
    { id: "RR-002", name: "Fire Marshal inspection", sub: "Building 1A · Annual", type: "permit", days: 28, due: "9 Jun", owner: "MR" as const | null, exposure: "med" as const, action: "Schedule walkthrough", status: "armed" as const },
    { id: "RR-022", name: "Salesforce Enterprise", sub: "Auto-renew · 142 seats", type: "subs", days: 34, due: "15 Jun", owner: null, exposure: "med" as const, action: "Review usage", status: "idle" as const },
    { id: "RR-005", name: "Building Permit · Wing C", sub: "Cambridge — expansion", type: "permit", days: 41, due: "22 Jun", owner: "JO" as const | null, exposure: "med" as const, action: "Submit drawings", status: "armed" as const },
    { id: "RR-011", name: "Cyber liability rider", sub: "Beazley · add-on", type: "insurance", days: 52, due: "3 Jul", owner: "SC" as const | null, exposure: "med" as const, action: "Compare coverage", status: "armed" as const },
    { id: "RR-018", name: "OSHA refresher training", sub: "All staff — annual", type: "cert", days: 61, due: "12 Jul", owner: "MR" as const | null, exposure: "med" as const, action: "Book sessions", status: "armed" as const },
    { id: "RR-024", name: "Acme Foods supply contract", sub: "60-day notice window", type: "contract", days: 73, due: "24 Jul", owner: null, exposure: "med" as const, action: "Confirm volumes", status: "idle" as const },
    { id: "RR-029", name: "Datadog APM", sub: "Auto-renew · committed spend", type: "subs", days: 84, due: "4 Aug", owner: "JO" as const | null, exposure: "low" as const, action: "Negotiate", status: "armed" as const },
  ],

  record: {
    id: "RR-014",
    name: "General Liability Insurance",
    sub: "Hartford · Policy #HL-9921 · $2M / $4M aggregate",
    typeLabel: "Insurance · Critical exposure",
    daysUntil: 4,
    hoursUntil: 4 * 24 + 14,
    noticeCloses: "Fri 15 May · 17:00 ET",
    countdown: [
      { k: "Days left", v: "04", klass: "crit" as const },
      { k: "Hours", v: "110", klass: "" as const },
      { k: "Notice closes", v: "76h", klass: "" as const },
      { k: "Last reminder", v: "12h", klass: "" as const },
    ],
    kv: [
      { k: "Due ID", v: "DR-014" },
      { k: "Type", v: "Insurance — General Liability" },
      { k: "Exposure", v: "Critical · revenue-blocking" },
      { k: "Owner", v: "Sarah Chen · ops@northwind.co" },
      { k: "Backup", v: "James Okafor" },
      { k: "Coverage", v: "$2,000,000 / $4,000,000 aggregate" },
      { k: "Carrier", v: "Hartford Financial" },
      { k: "Notice window", v: "Closes Friday 17:00 ET · 76 hours" },
    ],
    events: [
      { when: "12 May · 09:00", lvl: "warn", title: "Reminder sent to Sarah", sub: "Email + Slack · 4 days remaining" },
      { when: "10 May · 14:22", lvl: "warn", title: "Notice window opened", sub: "T-7 days — action required by Fri 15" },
      { when: "04 May · 11:08", lvl: "", title: "Escalated to Critical", sub: "Auto-rule: insurance & <14 days" },
      { when: "21 Apr · 16:40", lvl: "", title: "Backup assigned: James Okafor", sub: "By Sarah Chen" },
      { when: "01 Mar · 08:00", lvl: "safe", title: "Onboarded from spreadsheet", sub: "Due Intake batch 2026-Q1" },
    ],
    reminders: [
      { nm: "Owner — 14 days out", sub: "Email · Sent 28 Apr", on: true },
      { nm: "Owner — 7 days out", sub: "Email + Slack · Sent 09 May", on: true },
      { nm: "Owner — 72 hours out", sub: "Email + Slack + SMS · scheduled Wed", on: true },
      { nm: "Backup — 48 hours out", sub: "Email · scheduled Thu", on: true },
      { nm: "Escalate to CFO — 24h", sub: "If unresolved · scheduled Fri AM", on: false },
    ],
    path: [
      { idx: "01", nm: "Reminder dispatched", sub: "Owner notified at T-14, T-7, T-3", state: "done" as const },
      { idx: "02", nm: "Quote requested", sub: "Hartford broker · awaiting binder", state: "active" as const },
      { idx: "03", nm: "Renewal bound", sub: "Upload binder PDF to clear risk", state: "" },
      { idx: "04", nm: "Backup confirms coverage", sub: "James reviews policy in record", state: "" },
      { idx: "05", nm: "Risk returns to Protected", sub: "Auto, on binder + acknowledgement", state: "" },
    ],
  },

  ribbon: [
    { kind: "crit" as const, label: "G/L INSURANCE", val: "T-04D · NOTICE CLOSES FRI 17:00" },
    { kind: "warn" as const, label: "SOC 2 EVIDENCE", val: "12 ARTIFACTS PENDING · T-06D" },
    { kind: "warn" as const, label: "ANVIL MSA", val: "AUTO-RENEW NOTICE T-11D" },
    { kind: "info" as const, label: "BOSTON LIQUOR", val: "T-19D · OWNER MR" },
    { kind: "" as const, label: "WORKERS COMP", val: "QUOTES REQUESTED" },
    { kind: "" as const, label: "FIRE MARSHAL", val: "AWAITING DATE" },
    { kind: "" as const, label: "SALESFORCE", val: "REVIEW USAGE BY 11 JUN" },
    { kind: "info" as const, label: "CYBER RIDER", val: "COMPARING COVERAGE" },
  ],
} as const;

export type RRDataType = typeof RR_DATA;
