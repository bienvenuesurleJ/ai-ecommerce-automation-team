import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSim } from "@/lib/sim/store";
import { eur } from "./format";

function useTween(value: number) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  useEffect(() => {
    const from = current.current;
    const to = value;
    const start = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 480);
      const eased = 1 - (1 - p) ** 3;
      const next = from + (to - from) * eased;
      current.current = next;
      setShown(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return shown;
}

export function StatValue({ value, format = "eur", className = "" }: { value: number; format?: "eur" | "num" | "x"; className?: string }) {
  const n = useTween(value);
  const text = format === "eur" ? eur(n) : format === "x" ? `${n.toFixed(2)}x` : Math.round(n).toString();
  return <strong className={className}>{text}</strong>;
}

export function MetricsStrip() {
  const snap = useSim((s) => s.snap);
  const profitClass = snap.netProfit >= 0 ? "gain" : "loss";
  return (
    <footer className="metrics">
      <Metric label="Capital" value={snap.capital} />
      <Metric label="Chiffre d'affaires" value={snap.revenue} tone="gain" />
      <Metric label="Bénéfice net" value={snap.netProfit} tone={profitClass} />
      <Metric label="Dépenses pub" value={snap.adSpend} tone="loss" />
      <Metric label="Commandes" value={snap.orders} format="num" />
      <Metric label="ROAS" value={snap.roas} format="x" />
    </footer>
  );
}

function Metric({ label, value, format = "eur", tone = "" }: { label: string; value: number; format?: "eur" | "num" | "x"; tone?: string }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <StatValue value={value} format={format} />
    </div>
  );
}

export function FinanceCharts() {
  const history = useSim((s) => s.snap.history);
  const campaigns = useSim((s) => s.snap.campaigns);
  if (history.length < 2) {
    return <p className="empty">Les courbes se remplissent dès que la simulation tourne.</p>;
  }
  const bars = campaigns.slice(0, 6).map((c) => ({ name: c.product.split(" ")[0], profit: Math.round((c.revenue - c.spent) * 100) / 100 }));
  return (
    <div className="chart-grid">
      <figure>
        <figcaption>Capital</figcaption>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip contentStyle={tip} formatter={(v: number) => eur(Number(v))} />
              <Area dataKey="capital" stroke="#22d3ee" fill="#22d3ee33" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure>
        <figcaption>CA et bénéfice</figcaption>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis hide />
              <Tooltip contentStyle={tip} formatter={(v: number) => eur(Number(v))} />
              <Area dataKey="revenue" stroke="#3ee0a0" fill="#3ee0a022" strokeWidth={2} />
              <Area dataKey="netProfit" stroke="#e8c36a" fill="#e8c36a22" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure>
        <figcaption>Dépenses pub</figcaption>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <XAxis dataKey="t" hide />
              <YAxis hide />
              <Tooltip contentStyle={tip} formatter={(v: number) => eur(Number(v))} />
              <Area dataKey="adSpend" stroke="#ff5d73" fill="#ff5d7322" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </figure>
      <figure>
        <figcaption>Profit par campagne</figcaption>
        <div className="chart-box">
          {bars.length === 0 ? (
            <p className="empty">Aucune campagne.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars}>
                <XAxis dataKey="name" stroke="#93a0bd" fontSize={11} />
                <YAxis hide />
                <Tooltip contentStyle={tip} formatter={(v: number) => eur(Number(v))} />
                <Bar dataKey="profit" fill="#4f8cff" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </figure>
    </div>
  );
}

const tip = { background: "#0c1220", border: "1px solid #243049", borderRadius: 8, color: "#e8eefc" };
