import React, { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, RadialBarChart, RadialBar, ResponsiveContainer, AreaChart, Area,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */
const C = {
  ink: "var(--bg)",
  panel: "var(--bg-elevated)",
  panelAlt: "var(--panel-strong)",
  line: "var(--border)",
  hair: "rgba(255, 255, 255, 0.05)",
  text: "var(--text)",
  muted: "var(--muted)",
  faint: "var(--text-soft)",
  gold: "var(--accent-strong)",
  goldSoft: "rgba(255, 199, 106, 0.15)",
  teal: "var(--secondary)",
  tealSoft: "rgba(95, 143, 74, 0.15)",
  brick: "#ef4444",
  brickSoft: "rgba(239, 68, 68, 0.15)",
  slate: "var(--solar)",
  slateSoft: "rgba(130, 174, 202, 0.15)",
};

const SERIF = "'Source Serif 4', serif";
const SANS = "'Noto Sans', system-ui, sans-serif";
const MONO = "monospace";

/* ------------------------------------------------------------------ */
/* Mock data                                                           */
/* ------------------------------------------------------------------ */
const statusData = [
  { name: "Disbursed", value: 0, color: C.teal },
  { name: "Approved", value: 0, color: C.slate },
  { name: "Pending", value: 0, color: C.gold },
  { name: "Rejected", value: 0, color: C.brick },
];

const categoryApplications = [];
const schemeApplications = [];
const schemeFundUsage = [];
const categoryAmounts = [];
const monthly = [];
const sparkline = [];
const officerQueue = [];
const flagReasons = [];
const rejectionReasons = [];
const schemeTable = [];

const kpis = [
  { no: "01", label: "Total applications", value: 0, prefix: "", suffix: "" },
  { no: "02", label: "Pending review", value: 0, prefix: "", suffix: "" },
  { no: "03", label: "Approved", value: 0, prefix: "", suffix: "" },
  { no: "04", label: "Rejected", value: 0, prefix: "", suffix: "" },
  { no: "05", label: "Beneficiaries disbursed", value: 0, prefix: "", suffix: "" },
  { no: "06", label: "Leftover budget", value: 0, prefix: "\u20B9", suffix: " Cr" },
];

const fundSummary = [
  { label: "Allocated funds", value: "\u20B90 Cr", tone: C.text },
  { label: "Sanctioned amount", value: "\u20B90 Cr", tone: C.slate },
  { label: "Disbursed amount", value: "\u20B90 Cr", tone: C.teal },
  { label: "Leftover / unspent", value: "\u20B90 Cr", tone: C.gold },
];

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
function AnimatedNumber({ value, decimals = 0, prefix = "", suffix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
    });
    const unsub = mv.on("change", (v) => {
      setDisplay(
        decimals > 0
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString("en-IN")
      );
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, decimals, mv]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function Reveal({ children, delay = 0, y = 16 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ index, title, note }) {
  return (
    <div className="flex flex-col md:flex-row items-baseline justify-between mb-8 pb-4" style={{ borderBottom: `1px solid ${C.hair}` }}>
      <div className="flex items-center gap-4">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '10px', background: C.tealSoft, color: C.teal, fontFamily: MONO, fontSize: 14, fontWeight: 700, border: `1px solid rgba(95, 143, 74, 0.3)` }}>
          {index}
        </div>
        <h2 style={{ fontFamily: SERIF, color: C.text, fontSize: 26, fontWeight: 600, letterSpacing: "0.01em", textShadow: "0 2px 10px rgba(255,255,255,0.05)" }}>
          {title}
        </h2>
      </div>
      {note && (
        <span style={{ fontFamily: SANS, color: C.gold, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: 'uppercase', background: C.goldSoft, padding: '6px 14px', borderRadius: '99px', border: `1px solid rgba(255, 199, 106, 0.2)` }}>
          {note}
        </span>
      )}
    </div>
  );
}

function Panel({ children, style, className = "" }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
      transition={{ duration: 0.3 }}
      className={`p-6 rounded-2xl relative overflow-hidden flex flex-col ${className}`}
      style={{
        background: `linear-gradient(145deg, ${C.panelAlt}, ${C.panel})`,
        border: `1px solid ${C.line}`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        backdropFilter: "blur(12px)",
        ...style
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      {children}
    </motion.div>
  );
}

function ChartTitle({ children }) {
  return (
    <div style={{ fontFamily: SANS, color: C.muted, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
      {items.map((it) => (
        <div key={it.name} className="flex items-center gap-2">
          <span style={{ width: 8, height: 8, borderRadius: 2, background: it.color, display: "inline-block" }} />
          <span style={{ fontFamily: SANS, fontSize: 12, color: C.muted }}>{it.name}</span>
        </div>
      ))}
    </div>
  );
}

const tooltipStyle = {
  background: C.panelAlt,
  border: `1px solid ${C.line}`,
  borderRadius: 6,
  fontFamily: SANS,
  fontSize: 12,
  color: C.text,
  padding: "8px 10px",
};

/* ------------------------------------------------------------------ */
/* Signature: the register seal                                        */
/* ------------------------------------------------------------------ */
function RegisterSeal({ percent = 68 }) {
  const data = [{ value: percent, fill: C.gold }];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.5, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{ duration: 0.9, ease: [0.2, 1.4, 0.4, 1], delay: 0.3 }}
      className="relative flex items-center justify-center shrink-0"
      style={{ width: 148, height: 148 }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: `2px solid ${C.gold}`,
          boxShadow: `0 0 0 3px ${C.ink}, 0 0 0 4px ${C.goldSoft}`,
        }}
      />
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="92%"
            barSize={6}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: C.hair }} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <div className="relative flex flex-col items-center" style={{ transform: "rotate(8deg)" }}>
        <span style={{ fontFamily: MONO, fontSize: 26, color: C.gold, fontWeight: 700, lineHeight: 1 }}>
          <AnimatedNumber value={percent} suffix="%" />
        </span>
        <span style={{ fontFamily: SANS, fontSize: 9, color: C.gold, letterSpacing: "0.16em", marginTop: 4 }}>
          DISBURSED
        </span>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Main dashboard                                                      */
/* ------------------------------------------------------------------ */
export default function SchemeDashboard() {
  return (
    <div style={{ background: C.ink, minHeight: "100vh", fontFamily: SANS }}>
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Hero */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 mb-10" style={{ borderBottom: `1px solid ${C.hair}` }}>
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              style={{ fontFamily: MONO, color: C.teal, fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 16 }}
            >
              NATIONAL WELFARE SCHEMES DIVISION &nbsp;·&nbsp; FY 2025&ndash;26
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em", background: `linear-gradient(90deg, var(--text), ${C.muted})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >
              Scheme Disbursement<br />Register
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.12 }}
              style={{ fontFamily: SANS, color: C.muted, fontSize: 15, marginTop: 20, maxWidth: 480, lineHeight: 1.6 }}
            >
              A consolidated ledger of applications, fund flow, and disbursement
              status across all active welfare schemes. Updated as of 12 August 2026.
            </motion.p>
          </div>
          <RegisterSeal percent={0} />
        </div>

        {/* KPI ledger row */}
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
            {kpis.map((k, i) => (
              <motion.div
                key={k.no}
                whileHover={{ y: -6, scale: 1.02, boxShadow: "0 15px 35px rgba(0,0,0,0.25)" }}
                transition={{ duration: 0.3 }}
                className="p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between"
                style={{
                  background: `linear-gradient(135deg, ${C.panelAlt}, ${C.panel})`,
                  border: `1px solid ${C.line}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, ${C.teal}, ${C.gold})`, opacity: 0.9 }} />
                <div style={{ fontFamily: MONO, color: C.teal, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>KPI {k.no}</div>
                <div style={{ fontFamily: MONO, color: C.text, fontSize: 28, fontWeight: 700, marginTop: 16, letterSpacing: "-0.03em" }}>
                  <AnimatedNumber value={k.value} prefix={k.prefix} suffix={k.suffix} decimals={k.value % 1 !== 0 ? 1 : 0} />
                </div>
                <div style={{ fontFamily: SANS, color: C.muted, fontSize: 13, marginTop: 8, fontWeight: 500 }}>{k.label}</div>
              </motion.div>
            ))}
          </div>
        </Reveal>

        {/* 1 & 2 — Status + Fund distribution */}
        <Reveal>
          <SectionHeader index="01" title="Status &amp; fund distribution" note="ALL SCHEMES" />
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-14">
          <Reveal delay={0.05}>
            <Panel style={{ height: "100%" }}>
              <ChartTitle>Application status</ChartTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2}>
                    {statusData.map((d) => <Cell key={d.name} fill={d.color} stroke={C.panel} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <Legend items={statusData} />
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel style={{ height: "100%" }}>
              <ChartTitle>Applications by category</ChartTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryApplications} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fill: C.muted, fontSize: 11, fontFamily: SANS }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.hair }} />
                  <Bar dataKey="value" fill={C.slate} radius={[0, 3, 3, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel style={{ height: "100%" }}>
              <ChartTitle>Fund utilisation</ChartTitle>
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span style={{ fontFamily: SANS, fontSize: 12, color: C.muted }}>Disbursed / Allocated</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.teal }}>0.0%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: C.hair, overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: "0%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                      style={{ height: "100%", background: C.teal }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  {fundSummary.map((f) => (
                    <div key={f.label} className="flex justify-between items-baseline pb-2" style={{ borderBottom: `1px solid ${C.hair}` }}>
                      <span style={{ fontFamily: SANS, fontSize: 12, color: C.muted }}>{f.label}</span>
                      <span style={{ fontFamily: MONO, fontSize: 14, color: f.tone }}>{f.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* 2 — Scheme-wise analytics */}
        <Reveal>
          <SectionHeader index="02" title="Scheme-wise analytics" note="6 SCHEMES · 5 ACTIVE" />
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-14">
          <Reveal delay={0.05}>
            <Panel style={{ gridColumn: "span 1" }} >
              <ChartTitle>Applications per scheme</ChartTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={schemeApplications}>
                  <XAxis dataKey="name" tick={{ fill: C.faint, fontSize: 9, fontFamily: SANS }} axisLine={{ stroke: C.hair }} tickLine={false} interval={0} angle={-30} textAnchor="end" height={60} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.hair }} />
                  <Bar dataKey="value" fill={C.gold} radius={[3, 3, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel>
              <ChartTitle>Fund usage per scheme (\u20B9 Cr)</ChartTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={schemeFundUsage} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {schemeFundUsage.map((d) => <Cell key={d.name} fill={d.color} stroke={C.panel} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <Legend items={schemeFundUsage} />
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel>
              <ChartTitle>Scheme register</ChartTitle>
              <div className="flex flex-col">
                {schemeTable.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between py-2.5" style={{ borderBottom: i < schemeTable.length - 1 ? `1px solid ${C.hair}` : "none" }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: s.active ? C.teal : C.faint, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <div style={{ fontFamily: SANS, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                        <div style={{ fontFamily: SANS, fontSize: 10, color: C.faint }}>{s.category}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted, flexShrink: 0, marginLeft: 8 }}>{s.apps.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* 3 — Category amounts */}
        <Reveal>
          <SectionHeader index="03" title="Category-level fund breakdown" note="\u20B9 IN CRORES" />
        </Reveal>
        <div className="mb-14">
          <Reveal delay={0.05}>
            <Panel>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={categoryAmounts}>
                  <CartesianGrid strokeDasharray="2 6" stroke={C.hair} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11, fontFamily: SANS }} axisLine={{ stroke: C.hair }} tickLine={false} />
                  <YAxis tick={{ fill: C.faint, fontSize: 10, fontFamily: MONO }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.hair }} />
                  <Bar dataKey="sanctioned" stackId="a" fill={C.slate} radius={[0, 0, 0, 0]} barSize={26} />
                  <Bar dataKey="disbursed" stackId="b" fill={C.teal} radius={[0, 0, 0, 0]} barSize={26} />
                  <Bar dataKey="remaining" stackId="c" fill={C.gold} radius={[3, 3, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
              <Legend items={[{ name: "Sanctioned", color: C.slate }, { name: "Disbursed", color: C.teal }, { name: "Remaining", color: C.gold }]} />
            </Panel>
          </Reveal>
        </div>

        {/* 4 — Trends */}
        <Reveal>
          <SectionHeader index="04" title="Processing trends" note="LAST 12 MONTHS" />
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-14">
          <Reveal delay={0.05}>
            <Panel style={{ gridColumn: "span 2" }}>
              <ChartTitle>Applications vs disbursements over time</ChartTitle>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="2 6" stroke={C.hair} vertical={false} />
                  <XAxis dataKey="m" tick={{ fill: C.faint, fontSize: 10, fontFamily: SANS }} axisLine={{ stroke: C.hair }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="applications" stroke={C.slate} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="disbursements" stroke={C.teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <Legend items={[{ name: "Applications", color: C.slate }, { name: "Disbursements", color: C.teal }]} />
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel>
              <ChartTitle>Approvals vs rejections (7d)</ChartTitle>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={sparkline}>
                  <defs>
                    <linearGradient id="apprGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.teal} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={C.teal} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="approved" stroke={C.teal} fill="url(#apprGrad)" strokeWidth={2} />
                  <Line type="monotone" dataKey="rejected" stroke={C.brick} strokeWidth={2} dot={false} />
                  <XAxis dataKey="d" tick={{ fill: C.faint, fontSize: 9, fontFamily: SANS }} axisLine={false} tickLine={false} />
                </AreaChart>
              </ResponsiveContainer>
              <Legend items={[{ name: "Approved", color: C.teal }, { name: "Rejected", color: C.brick }]} />
            </Panel>
          </Reveal>
        </div>

        {/* 5 — Queue + Risk */}
        <Reveal>
          <SectionHeader index="05" title="Queue &amp; risk flags" />
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-14">
          <Reveal delay={0.05}>
            <div className="flex flex-col gap-5 lg:col-span-1">
              <Panel>
                <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginBottom: 8 }}>Pending applications</div>
                <div style={{ fontFamily: MONO, fontSize: 30, color: C.gold, fontWeight: 600 }}>
                  <AnimatedNumber value={0} />
                </div>
              </Panel>
              <Panel>
                <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginBottom: 8 }}>Awaiting disbursement</div>
                <div style={{ fontFamily: MONO, fontSize: 30, color: C.slate, fontWeight: 600 }}>
                  <AnimatedNumber value={0} />
                </div>
              </Panel>
              <Panel>
                <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginBottom: 8 }}>Flagged cases</div>
                <div style={{ fontFamily: MONO, fontSize: 30, color: C.brick, fontWeight: 600 }}>
                  <AnimatedNumber value={0} />
                </div>
              </Panel>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel style={{ gridColumn: "span 2" }}>
              <ChartTitle>Queue size by officer</ChartTitle>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={officerQueue} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fill: C.muted, fontSize: 11, fontFamily: SANS }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: C.hair }} />
                  <Bar dataKey="value" fill={C.slate} radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel>
              <ChartTitle>Top flag reasons</ChartTitle>
              <div className="flex flex-col gap-3">
                {flagReasons.map((f) => (
                  <div key={f.reason}>
                    <div className="flex justify-between mb-1">
                      <span style={{ fontFamily: SANS, fontSize: 11, color: C.muted }}>{f.reason}</span>
                      <span style={{ fontFamily: MONO, fontSize: 11, color: C.brick }}>{f.count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: C.hair, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(f.count / flagReasons[0].count) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: "100%", background: C.brick }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* 6 — Approval performance + documents */}
        <Reveal>
          <SectionHeader index="06" title="Approval performance &amp; eligibility" />
        </Reveal>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-16">
          <Reveal delay={0.05}>
            <Panel className="flex items-center gap-5">
              <div className="flex items-center gap-5">
                <ResponsiveContainer width={90} height={90}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={7} data={[{ value: 0, fill: C.teal }]} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={4} background={{ fill: C.hair }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 22, color: C.teal, fontWeight: 600 }}>0%</div>
                  <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted }}>Approval rate</div>
                </div>
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel>
              <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginBottom: 8 }}>Avg. application &rarr; approval</div>
              <div style={{ fontFamily: MONO, fontSize: 28, color: C.text, fontWeight: 600 }}>0 <span style={{ fontSize: 14, color: C.faint }}>days</span></div>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel>
              <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginBottom: 8 }}>Avg. approval &rarr; disbursement</div>
              <div style={{ fontFamily: MONO, fontSize: 28, color: C.text, fontWeight: 600 }}>0 <span style={{ fontSize: 14, color: C.faint }}>days</span></div>
            </Panel>
          </Reveal>

          <Reveal delay={0.1}>
            <Panel style={{ gridColumn: "span 2" }}>
              <ChartTitle>Rejection reason categories</ChartTitle>
              <div className="flex flex-col gap-3">
                {rejectionReasons.map((r) => (
                  <div key={r.reason} className="flex items-center gap-3">
                    <span style={{ fontFamily: SANS, fontSize: 11, color: C.muted, width: 170, flexShrink: 0 }}>{r.reason}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.hair, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${r.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        style={{ height: "100%", background: C.slate }}
                      />
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint, width: 30, textAlign: "right" }}>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>

          <Reveal delay={0.15}>
            <Panel>
              <div style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginBottom: 10 }}>Applications with missing docs</div>
              <div style={{ fontFamily: MONO, fontSize: 26, color: C.brick, fontWeight: 600, marginBottom: 10 }}>0%</div>
              <div style={{ height: 6, borderRadius: 3, background: C.hair, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "0%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  style={{ height: "100%", background: C.brick }}
                />
              </div>
            </Panel>
          </Reveal>
        </div>

        {/* Footer */}
        <div className="pt-6 flex justify-between items-center" style={{ borderTop: `1px solid ${C.hair}` }}>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.08em" }}>
            REGISTER SNAPSHOT &middot; STATIC DEMO DATA
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.08em" }}>
            PAGE 01 / 01
          </span>
        </div>
      </div>
    </div>
  );
}
